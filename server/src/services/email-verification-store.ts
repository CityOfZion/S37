import { createHash, randomInt, timingSafeEqual } from 'crypto'

import { prisma } from './prisma-service'

const CODE_TTL_MS = 10 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000
const MAX_ATTEMPTS = 5
const SWEEP_INTERVAL_MS = 5 * 60 * 1000

const sweepInterval = setInterval(() => {
  prisma.emailVerificationChallenge
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => {})
}, SWEEP_INTERVAL_MS)

sweepInterval.unref()

export const normalizeEmail = (email: string): string => email.trim().toLowerCase()

const hashCode = (code: string): string => createHash('sha256').update(code).digest('hex')

const generateCode = (): string => randomInt(0, 1_000_000).toString().padStart(6, '0')

export type TCreateChallengeFailure = { ok: false; cooldownEndsAt: number }
export type TCreateChallengeSuccess = {
  ok: true
  code: string
  expiresAt: number
  cooldownEndsAt: number
}
export type TCreateChallengeResult = TCreateChallengeSuccess | TCreateChallengeFailure

type TCreateChallengeInput = {
  email: string
  fullName: string
}

export const createChallenge = async ({
  email,
  fullName,
}: TCreateChallengeInput): Promise<TCreateChallengeResult> => {
  const key = normalizeEmail(email)
  const now = Date.now()
  const existing = await prisma.emailVerificationChallenge.findUnique({ where: { email: key } })

  if (existing && existing.cooldownEndsAt.getTime() > now && existing.expiresAt.getTime() > now) {
    return { ok: false, cooldownEndsAt: existing.cooldownEndsAt.getTime() }
  }

  const code = generateCode()
  const expiresAt = now + CODE_TTL_MS
  const cooldownEndsAt = now + RESEND_COOLDOWN_MS
  const codeHash = hashCode(code)

  await prisma.emailVerificationChallenge.upsert({
    where: { email: key },
    update: {
      codeHash,
      fullName,
      expiresAt: new Date(expiresAt),
      cooldownEndsAt: new Date(cooldownEndsAt),
      attempts: 0,
    },
    create: {
      email: key,
      codeHash,
      fullName,
      expiresAt: new Date(expiresAt),
      cooldownEndsAt: new Date(cooldownEndsAt),
      attempts: 0,
    },
  })

  return { ok: true, code, expiresAt, cooldownEndsAt }
}

export type TConsumeChallengeResult =
  | { ok: true; fullName: string }
  | { ok: false; reason: 'not_found' | 'expired' | 'invalid' | 'too_many_attempts' }

type TConsumeChallengeInput = {
  email: string
  code: string
}

export const consumeChallenge = async ({
  email,
  code,
}: TConsumeChallengeInput): Promise<TConsumeChallengeResult> => {
  const key = normalizeEmail(email)
  const entry = await prisma.emailVerificationChallenge.findUnique({ where: { email: key } })

  if (!entry) return { ok: false, reason: 'not_found' }

  if (entry.expiresAt.getTime() < Date.now()) {
    await prisma.emailVerificationChallenge.delete({ where: { email: key } })

    return { ok: false, reason: 'expired' }
  }

  const submittedHash = hashCode(code)
  const submittedBuffer = Buffer.from(submittedHash, 'hex')
  const storedBuffer = Buffer.from(entry.codeHash, 'hex')

  const matches =
    submittedBuffer.length === storedBuffer.length && timingSafeEqual(submittedBuffer, storedBuffer)

  if (matches) {
    await prisma.emailVerificationChallenge.delete({ where: { email: key } })

    return { ok: true, fullName: entry.fullName }
  }

  const attempts = entry.attempts + 1

  if (attempts >= MAX_ATTEMPTS) {
    await prisma.emailVerificationChallenge.delete({ where: { email: key } })

    return { ok: false, reason: 'too_many_attempts' }
  }

  await prisma.emailVerificationChallenge.update({
    where: { email: key },
    data: { attempts },
  })

  return { ok: false, reason: 'invalid' }
}

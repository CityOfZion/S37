import { createHash, randomInt, timingSafeEqual } from 'crypto'

const CODE_TTL_MS = 10 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000
const MAX_ATTEMPTS = 5
const SWEEP_INTERVAL_MS = 5 * 60 * 1000

type TChallengeEntry = {
  codeHash: string
  fullName: string
  expiresAt: number
  cooldownEndsAt: number
  attempts: number
}

const store = new Map<string, TChallengeEntry>()

const sweepInterval = setInterval(() => {
  const now = Date.now()

  for (const [email, entry] of store) {
    if (entry.expiresAt < now) store.delete(email)
  }
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

export const createChallenge = ({
  email,
  fullName,
}: TCreateChallengeInput): TCreateChallengeResult => {
  const key = normalizeEmail(email)
  const now = Date.now()
  const existing = store.get(key)

  if (existing && existing.cooldownEndsAt > now && existing.expiresAt > now) {
    return { ok: false, cooldownEndsAt: existing.cooldownEndsAt }
  }

  const code = generateCode()
  const expiresAt = now + CODE_TTL_MS
  const cooldownEndsAt = now + RESEND_COOLDOWN_MS

  store.set(key, {
    codeHash: hashCode(code),
    fullName,
    expiresAt,
    cooldownEndsAt,
    attempts: 0,
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

export const consumeChallenge = ({
  email,
  code,
}: TConsumeChallengeInput): TConsumeChallengeResult => {
  const key = normalizeEmail(email)
  const entry = store.get(key)

  if (!entry) return { ok: false, reason: 'not_found' }

  if (entry.expiresAt < Date.now()) {
    store.delete(key)

    return { ok: false, reason: 'expired' }
  }

  const submittedHash = hashCode(code)
  const submittedBuffer = Buffer.from(submittedHash, 'hex')
  const storedBuffer = Buffer.from(entry.codeHash, 'hex')

  const matches =
    submittedBuffer.length === storedBuffer.length && timingSafeEqual(submittedBuffer, storedBuffer)

  if (matches) {
    store.delete(key)

    return { ok: true, fullName: entry.fullName }
  }

  entry.attempts += 1

  if (entry.attempts >= MAX_ATTEMPTS) {
    store.delete(key)

    return { ok: false, reason: 'too_many_attempts' }
  }

  return { ok: false, reason: 'invalid' }
}

import { randomBytes } from 'crypto'

const CODE_TTL_MS = 60_000

type TAuthCodeEntry = {
  userId: string
  email: string
  challenge: string
  expiresAt: number
}

const SWEEP_INTERVAL_MS = 60_000

const store = new Map<string, TAuthCodeEntry>()

const sweepInterval = setInterval(() => {
  const now = Date.now()

  for (const [code, entry] of store) {
    if (entry.expiresAt < now) store.delete(code)
  }
}, SWEEP_INTERVAL_MS)

sweepInterval.unref()

export const createAuthCode = (entry: Omit<TAuthCodeEntry, 'expiresAt'>): string => {
  const code = randomBytes(32).toString('base64url')

  store.set(code, { ...entry, expiresAt: Date.now() + CODE_TTL_MS })

  return code
}

export const consumeAuthCode = (code: string): Omit<TAuthCodeEntry, 'expiresAt'> | null => {
  const entry = store.get(code)

  if (!entry) return null

  store.delete(code)

  if (entry.expiresAt < Date.now()) return null

  const { expiresAt: _expiresAt, ...rest } = entry

  return rest
}

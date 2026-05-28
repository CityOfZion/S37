import type { TExchangePayload, TExchangeResult } from 'fractapay-shared'

import { AUTH_TOKEN_STORAGE_KEY, BASE_PATH, PKCE_VERIFIER_STORAGE_KEY } from '../constants'
import { server } from '../services/server'
import { EnvHelper } from './EnvHelper'

const ROOT_PATHS = new Set(BASE_PATH ? [BASE_PATH, `${BASE_PATH}/`] : ['/'])

const isTrustedLanding = (): boolean => {
  if (ROOT_PATHS.has(window.location.pathname)) return true

  const referrer = document.referrer

  if (!referrer) return false

  try {
    const referrerOrigin = new URL(referrer).origin
    const serverOrigin = new URL(EnvHelper.API_URL).origin

    return referrerOrigin === serverOrigin
  } catch {
    return false
  }
}

const stripQuery = (): void => {
  window.history.replaceState(null, '', window.location.pathname)
}

export const exchangeCodeFromQuery = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false

  const code = new URLSearchParams(window.location.search).get('code')

  if (!code) return false

  if (localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || !isTrustedLanding()) {
    sessionStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY)
    stripQuery()

    return false
  }

  const verifier = sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY)

  if (!verifier) {
    stripQuery()

    return false
  }

  let tokenStored = false

  try {
    const payload: TExchangePayload = { code, verifier }
    const { data } = await server.post<TExchangeResult>('/auth/exchange', payload)

    if (data.success) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.token)
      tokenStored = true
    }
  } catch {
    // ignore — landing without a valid token routes the user to /login
  } finally {
    sessionStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY)
    stripQuery()
  }

  return tokenStored
}

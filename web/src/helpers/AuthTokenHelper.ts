import type { TAuthToken, TExchangePayload } from 'fractapay-shared'

import { AUTH_TOKEN_STORAGE_KEY, BASE_PATH, PKCE_VERIFIER_STORAGE_KEY } from '../constants'
import { server } from '../services/server'
import { EnvHelper } from './EnvHelper'

export class AuthTokenHelper {
  static readonly #ROOT_PATHS = new Set(BASE_PATH ? [BASE_PATH, `${BASE_PATH}/`] : ['/'])

  static isTrustedLanding(): boolean {
    if (this.#ROOT_PATHS.has(window.location.pathname)) return true

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

  static stripQuery(): void {
    window.history.replaceState(null, '', window.location.pathname)
  }

  static async exchangeCodeFromQuery(): Promise<boolean> {
    if (typeof window === 'undefined') return false

    const code = new URLSearchParams(window.location.search).get('code')

    if (!code) return false

    if (localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || !AuthTokenHelper.isTrustedLanding()) {
      sessionStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY)
      AuthTokenHelper.stripQuery()

      return false
    }

    const verifier = sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY)

    if (!verifier) {
      AuthTokenHelper.stripQuery()

      return false
    }

    let tokenStored = false

    try {
      const payload: TExchangePayload = { code, verifier }
      const { data } = await server.post<TAuthToken>('/auth/exchange', payload)

      if (data.token) {
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.token)
        tokenStored = true
      }
    } finally {
      sessionStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY)
      AuthTokenHelper.stripQuery()
    }

    return tokenStored
  }
}

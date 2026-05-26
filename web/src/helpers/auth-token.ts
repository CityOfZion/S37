import { AUTH_TOKEN_STORAGE_KEY, BASE_PATH } from '../constants'
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

export const captureTokenFromHash = (): void => {
  if (typeof window === 'undefined') return

  const hash = window.location.hash

  if (!hash.startsWith('#token=')) return

  if (localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)

    return
  }

  if (!isTrustedLanding()) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)

    return
  }

  const token = hash.slice('#token='.length)

  if (token) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
  }

  window.history.replaceState(null, '', window.location.pathname + window.location.search)
}

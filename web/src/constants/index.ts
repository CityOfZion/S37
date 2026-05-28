import type { TLanguage } from 'fractapay-shared'

export const APP_NAME = 'FractaPay'

export const AUTH_TOKEN_STORAGE_KEY = 'fractapay.token'

export const PKCE_VERIFIER_STORAGE_KEY = 'fractapay.pkce_verifier'

export const PROD_BASE_PATH = '/S37'

export const BASE_PATH = import.meta.env.PROD ? PROD_BASE_PATH : undefined

export const LANGUAGE_NAMES: Record<TLanguage, string> = {
  'en-US': 'English',
  'pt-BR': 'Português',
}

import type { TLanguage, TToken } from 'fractapay-shared'
import { TOKEN } from 'fractapay-shared'

import tesouroIconUrl from '../assets/icons/tesouro-icon.webp'

export const AUTH_TOKEN_STORAGE_KEY = 'fractapay.token'

export const PKCE_VERIFIER_STORAGE_KEY = 'fractapay.pkce-verifier'

export const LANGUAGE_STORAGE_KEY = 'fractapay.language'

export const KYC_STORAGE_KEY = 'fractapay.kyc'

export const BASE_PATH = import.meta.env.PROD ? '/S37' : undefined

export const LANGUAGE_NAMES: Record<TLanguage, string> = {
  'en-US': 'English',
  'pt-BR': 'Português',
}

export const TOKEN_ICON_URL: Partial<Record<TToken, string>> = {
  [TOKEN.TESOURO]: tesouroIconUrl,
}

export const EMPTY_VALUE = '—'

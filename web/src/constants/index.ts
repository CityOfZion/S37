import type { TLanguage, TPaymentStatus, TToken } from 'fractapay-shared'
import { TOKEN } from 'fractapay-shared'

import tesouroIconUrl from '../assets/icons/tesouro-icon.webp'

export { APP_NAME } from 'fractapay-shared'

export const AUTH_TOKEN_STORAGE_KEY = 'fractapay.token'

export const PKCE_VERIFIER_STORAGE_KEY = 'fractapay.pkce_verifier'

export const PROD_BASE_PATH = '/S37'

export const BASE_PATH = import.meta.env.PROD ? PROD_BASE_PATH : undefined

export const LANGUAGE_NAMES: Record<TLanguage, string> = {
  'en-US': 'English',
  'pt-BR': 'Português',
}

export const TOKEN_ICON_URL: Partial<Record<TToken, string>> = {
  [TOKEN.TESOURO]: tesouroIconUrl,
}

export const PAYMENT_STATUS_CLASSES: Record<TPaymentStatus, string> = {
  CREATED: 'bg-blue-100 text-blue-700',
  FUNDED: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-orange-100 text-orange-700',
  CANCELED: 'bg-neutral-100 text-neutral-600',
}

export const EMPTY_VALUE = '—'

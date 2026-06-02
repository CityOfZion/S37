import BigNumber from 'bignumber.js'

import type {
  TFiatCurrency,
  TLanguage,
  TPaymentMessageRole,
  TPaymentStatus,
  TPixKeyType,
  TToken,
} from '../types'

export const ALLOWED_EXTENSIONS = ['csv', 'xls', 'xlsx', 'pdf', 'txt'] as const

export const ALLOWED_MIME_TYPES = [
  'text/csv',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
] as const

export const ALLOWED_INPUT_ACCEPT = ALLOWED_EXTENSIONS.map(extension => `.${extension}`).join(',')

export const TOKEN: Record<TToken, TToken> = {
  TESOURO: 'TESOURO',
} as const

export const SUPPORTED_TOKENS: TToken[] = [TOKEN.TESOURO] as const

export const PIX_KEY: Record<TPixKeyType, TPixKeyType> = {
  EVP: 'EVP',
  CPF: 'CPF',
  CNPJ: 'CNPJ',
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
} as const

export const SUPPORTED_LANGUAGES: TLanguage[] = ['en-US', 'pt-BR'] as const

export const DEFAULT_LANGUAGE: TLanguage = 'en-US'

export const STELLAR_DECIMALS = 7

export const FIAT_BY_TOKEN: Record<TToken, TFiatCurrency> = {
  [TOKEN.TESOURO]: 'BRL',
}

export const LANGUAGE_BY_TOKEN: Record<TToken, TLanguage> = {
  [TOKEN.TESOURO]: 'pt-BR',
}

export const SYMBOL_BY_TOKEN: Record<TToken, 'R$'> = {
  [TOKEN.TESOURO]: 'R$',
}

export const RECIPIENT_PERCENTAGE = new BigNumber('0.15')

export const FEE_PERCENTAGE = new BigNumber('0.02')

export const QUOTE_EXPIRY_SECONDS = 60

export const APP_NAME = 'FractaPay'

export const TOKENS: TToken[] = Object.values(TOKEN) as TToken[]

export const PIX_KEY_TYPES: TPixKeyType[] = Object.values(PIX_KEY) as TPixKeyType[]

export const PAYMENT_MESSAGE_ROLES: TPaymentMessageRole[] = ['USER', 'ASSISTANT']

export const PAYMENT_STATUSES: TPaymentStatus[] = [
  'CREATED',
  'FUNDED',
  'COMPLETED',
  'FAILED',
  'REFUNDED',
  'CANCELED',
]

export type TToken = 'TESOURO'

export type TLanguage = 'en-US' | 'pt-BR'

export type TPixKeyType = 'EVP' | 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE'

export type TFiatCurrency = 'BRL'

export type TPaymentStatus = 'CREATED' | 'FUNDED' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELED'

export type TPaymentMethod = 'PIX'

export type TPaymentMessageRole = 'ASSISTANT' | 'USER'

export type TKycStatus = 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED'

export enum EErrorCode {
  NO_FILE = 'NO_FILE',
  UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_PAYLOAD = 'INVALID_PAYLOAD',
  AI_PARSE_FAILED = 'AI_PARSE_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_FETCH_FAILED = 'RATE_FETCH_FAILED',
  ORDERBOOK_FETCH_FAILED = 'ORDERBOOK_FETCH_FAILED',
  ETHERFUSE_REQUEST_FAILED = 'ETHERFUSE_REQUEST_FAILED',
  KYC_NOT_APPROVED = 'KYC_NOT_APPROVED',
  QUOTE_EXPIRED = 'QUOTE_EXPIRED',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  PENDING_ORDER_EXISTS = 'PENDING_ORDER_EXISTS',
  CUSTOMER_ALREADY_EXISTS = 'CUSTOMER_ALREADY_EXISTS',
  CUSTOMER_NOT_FOUND = 'CUSTOMER_NOT_FOUND',
  FILE_PARSE_FAILED = 'FILE_PARSE_FAILED',
  NO_PAYMENTS_FOUND = 'NO_PAYMENTS_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  OAUTH_FAILED = 'OAUTH_FAILED',
  INVALID_AUTH_CODE = 'INVALID_AUTH_CODE',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  ONBOARDING_ALREADY_COMPLETED = 'ONBOARDING_ALREADY_COMPLETED',
  EMAIL_ALREADY_REGISTERED = 'EMAIL_ALREADY_REGISTERED',
  EMAIL_LINKED_TO_OAUTH = 'EMAIL_LINKED_TO_OAUTH',
  INVALID_VERIFICATION_CODE = 'INVALID_VERIFICATION_CODE',
  VERIFICATION_EXPIRED = 'VERIFICATION_EXPIRED',
  TOO_MANY_VERIFICATION_ATTEMPTS = 'TOO_MANY_VERIFICATION_ATTEMPTS',
  RESEND_TOO_SOON = 'RESEND_TOO_SOON',
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',
  WALLET_NOT_REGISTERED = 'WALLET_NOT_REGISTERED',
  BALANCE_FETCH_FAILED = 'BALANCE_FETCH_FAILED',
  DESTINATION_NOT_FOUND = 'DESTINATION_NOT_FOUND',
  DESTINATION_PIX_KEY_EXISTS = 'DESTINATION_PIX_KEY_EXISTS',
  DESTINATION_NAME_EXISTS = 'DESTINATION_NAME_EXISTS',
  PAYMENT_NOT_FOUND = 'PAYMENT_NOT_FOUND',
  PAYMENT_CREATE_FAILED = 'PAYMENT_CREATE_FAILED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  UNKNOWN = 'UNKNOWN',
}

export type TErrorResponse = {
  error: EErrorCode
}

export type TUser = {
  id: string
  email: string
  name: string | null
  picture: string | null
  onboardingCompletedAt: string | null
  address: string | null
  passkeyCredentialId: string | null
}

export type TAuthToken = {
  token: string
}

export type TCompleteOnboardingPayload = {
  companyName: string
  address: string
  passkeyCredentialId: string
}

export type TExchangePayload = {
  code: string
  verifier: string
}

export type TOnboardingPayload = {
  address: string
}

export type TOnboardingResult = {
  externalCustomerId: string
  externalBankAccountId: string
  presignedUrl: string
}

export type TKycStatusResponse = {
  status: TKycStatus
}

export type TQuotePayload = {
  externalCustomerId: string
  sourceAmount: string
  token: TToken
  address: string
}

export type TQuoteResult = {
  externalQuoteId: string
  sourceAmount: string
  destinationAmount: string
  exchangeRate: string
  feeAmount: string
  expiresAt: string
  createdAt: string
  address: string
  addressUrl: string
}

export type TDestination = {
  id: string
  name: string
  token: TToken
  pixKey: string
  pixKeyType: TPixKeyType
}

export type TCreateDestinationPayload = {
  name: string
  token: TToken
  pixKey: string
  pixKeyType: TPixKeyType
}

export type TUpdateDestinationPayload = {
  name?: string
  token?: TToken
  pixKey?: string
  pixKeyType?: TPixKeyType
}

export type TPaymentPix = {
  pixCode: string
  pixKey?: string
  pixKeyType?: string
  beneficiary?: string
  amount: string
  currency: TFiatCurrency
}

export type TPaymentDestination = {
  id: string
  destinationId: string | null
  name: string
  token: TToken
  pixKey: string
  pixKeyType: TPixKeyType
  percentage: number
  amount: string
}

export type TPaymentItem = {
  id: string
  amount: string
  description: string | null
}

export type TPaymentMessage = {
  id: string
  role: TPaymentMessageRole
  text: string
  createdAt: string
}

export type TPayment = {
  id: string
  externalId: string
  transactionHash: string | null
  transactionUrl: string | null
  status: TPaymentStatus
  token: TToken
  method: TPaymentMethod
  amount: string
  feeAmount: string
  feePercentage: string
  tokenAmount: string
  exchangeRate: string
  address: string
  addressUrl: string
  isRecurrence: boolean
  errorMessage: string | null
  createdAt: string
  updatedAt: string
  items: TPaymentItem[]
  destinations: TPaymentDestination[]
  messages: TPaymentMessage[]
  pix: TPaymentPix | null
}

export type TCreatePaymentItem = {
  amount: string
  description: string | null
}

export type TCreatePaymentDestination = {
  id: string
  name: string
  token: TToken
  pixKey: string
  pixKeyType: TPixKeyType
  amount: string
  percentage: number
}

export type TCreatePaymentMessage = {
  role: TPaymentMessageRole
  text: string
}

export type TCreatePaymentPayload = {
  externalQuoteId: string
  externalCustomerId: string
  externalBankAccountId: string
  address: string
  amount: string
  feeAmount: string
  feePercentage: string
  exchangeRate: string
  token: TToken
  tokenAmount: string
  items: TCreatePaymentItem[]
  destinations: TCreatePaymentDestination[]
  messages: TCreatePaymentMessage[]
}

export type TGetPaymentsParams = {
  page?: number
  pageSize?: number
  status?: TPaymentStatus
  dateFrom?: string
  dateTo?: string
}

export type TGetPaymentsResponse = {
  data: TPayment[]
  total: number
  page: number
  pageSize: number
}

export type TUpdatePaymentByIdParams = {
  id: string
  status: string
  tokenAmount: string
  transactionHash: string
}

export type TPaymentSummaryItem = {
  destinationName: string
  token: TToken
  amount: string
  percentage: number
  feeAmount?: string
  totalAmount?: string
}

export type TChatMessageHistory = {
  role: TPaymentMessageRole
  text: string
}

export type TChatMessage = {
  id: string
  role: TPaymentMessageRole
  text: string
  type: 'text' | 'file' | 'summary'
  payments?: TPaymentItem[]
  summary?: TPaymentSummaryItem[]
  timestamp: string
}

export type TChatAction =
  | 'NONE'
  | 'ADD_PAYMENTS'
  | 'UPDATE_PAYMENTS'
  | 'SET_DESTINATIONS'
  | 'REQUEST_CONFIRMATION'
  | 'EXECUTE'
  | 'CLEAR'
  | 'CREATE_DESTINATION'

export type TChatDestination = {
  destination: TDestination
  percentage: number
}

export type TChatPayment = {
  payments: TPaymentItem[]
}

export type TChatResponse =
  | {
      text: string
      action: TChatAction
      error?: EErrorCode
      payments?: TChatPayment[]
      destinations?: TChatDestination[]
      summary?: TPaymentSummaryItem[]
      newDestination?: TCreateDestinationPayload
      fileName?: string
    }
  | TErrorResponse

export type TSignupRequestPayload = {
  fullName: string
  email: string
}

export type TSignupRequestResponse =
  | { expiresAt: string; cooldownEndsAt: string }
  | (TErrorResponse & { cooldownEndsAt?: string })

export type TSignupVerifyPayload = {
  email: string
  code: string
}

export type TSignupVerifyResponse = { token: string; user: TUser } | TErrorResponse

export type TPasskeyLoginPayload = {
  address: string
}

export type TPasskeyLoginResponse = { token: string; user: TUser } | TErrorResponse

export type TBalanceResult = {
  token: TToken
  balance: string
  balanceInFiat: string
}

export type TBalanceResponse = TBalanceResult | TErrorResponse

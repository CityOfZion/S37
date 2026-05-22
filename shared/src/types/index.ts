export type TToken = 'TESOURO'

export type TLanguage = 'en-US' | 'pt-BR'

export type TPixKeyType = 'evp' | 'cpf' | 'cnpj' | 'email' | 'phone'

export enum ErrorCode {
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
  UNKNOWN = 'UNKNOWN',
}

export type TPayment = {
  id: string
  amount: string
  description?: string
}

export type TPaymentResponse = {
  payments: TPayment[]
  price: string
}

export type TUploadPayload = {
  file: File
  token: TToken
  address: string
}

export type TUploadResult = {
  success: boolean
  payments: TPayment[]
  price: string
  error?: ErrorCode
}

export type TRecipientShare = {
  address: string
  percentage: number
}

export type TFiatCurrency = 'BRL'

export type TKycStatus = 'not_started' | 'pending' | 'approved' | 'rejected'

export type TOnboardingPayload = {
  publicKey: string
}

export type TOnboardingResult = {
  customerId: string
  bankAccountId: string
  presignedUrl: string
}

export type TKycStatusResult = {
  status: TKycStatus
}

export type TBankAccountPayload = {
  presignedUrl: string
  pixKey: string
  pixKeyType: TPixKeyType
  firstName: string
  lastName: string
  cpf: string
}

export type TBankAccountResult = {
  bankAccountId: string
  pixKey?: string
  status: string
}

export type TQuotePayload = {
  customerId: string
  sourceAmount: string
  token: TToken
  publicKey: string
}

export type TQuoteResult = {
  quoteId: string
  sourceAmount: string
  destinationAmount: string
  exchangeRate: string
  feeAmount: string
  etherfuseFeeAmount: string
  fractapayFeeAmount: string
  expiresAt: string
  createdAt: string
}

export type TOrderPayload = {
  quoteId: string
  customerId: string
  bankAccountId: string
  publicKey: string
  memo?: string
}

export type TPixInstructions = {
  pixCode: string
  pixKey?: string
  pixKeyType?: string
  beneficiary?: string
  amount: string
  currency: 'BRL'
}

export type TOrderStatus = 'created' | 'funded' | 'completed' | 'failed' | 'refunded' | 'canceled'

export type TOrderResult = {
  orderId: string
  status: TOrderStatus
  pix?: TPixInstructions
  confirmedTxSignature?: string
  amountInFiat?: string
  amountInTokens?: string
}

export type TDestination = {
  id: string
  name: string
  token: TToken
  stellarAddress: string
  pixKey: string
  pixKeyType: TPixKeyType
}

export type TDestinationAllocation = {
  destination: TDestination
  percentage: number
}

export type TPaymentSummaryItem = {
  destinationName: string
  stellarAddress: string
  amount: string
  percentage: number
}

export type TChatRole = 'user' | 'assistant'

export type TChatMessage = {
  id: string
  role: TChatRole
  content: string
  type: 'text' | 'file-import' | 'summary'
  payments?: TPayment[]
  summary?: TPaymentSummaryItem[]
  timestamp: string
}

export type TChatAction =
  | 'none'
  | 'add_payments'
  | 'set_allocations'
  | 'request_confirmation'
  | 'execute'
  | 'clear'

export type TChatRequest = {
  messages: { role: TChatRole; content: string }[]
  destinations: TDestination[]
  payments: TPayment[]
  allocations: TDestinationAllocation[]
  language: TLanguage
}

export type TChatResponse = {
  message: string
  action: TChatAction
  payments?: TPayment[]
  price?: string
  allocations?: TDestinationAllocation[]
  summary?: TPaymentSummaryItem[]
}

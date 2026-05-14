import BigNumber from 'bignumber.js'

export type TToken = 'XLM' | 'USDC' | 'EURC'

export enum ErrorCode {
  NO_FILE = 'NO_FILE',
  UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE',
  INVALID_TOKEN = 'INVALID_TOKEN',
  AI_RESPONSE_TYPE = 'AI_RESPONSE_TYPE',
  AI_PARSE_FAILED = 'AI_PARSE_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export type TPayment = {
  id: string
  address: string
  amount: BigNumber
  token: TToken
  description?: string
}

export type TPaymentResponse = {
  payments: TPayment[]
}

export type TUploadPayload = {
  file: File
  token: TToken
  destinationAddress?: string
}

export type TUploadResult = {
  success: boolean
  payments: TPayment[]
  error?: ErrorCode
}

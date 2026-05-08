export enum ErrorCode {
  NO_FILE = 'NO_FILE',
  UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE',
  AI_RESPONSE_TYPE = 'AI_RESPONSE_TYPE',
  AI_PARSE_FAILED = 'AI_PARSE_FAILED',
  FILE_PARSE_FAILED = 'FILE_PARSE_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export type TPayment = {
  address: string
  amount: number
  description?: string
}

export type TPaymentResponse = {
  payments: TPayment[]
}

export type TUploadResult = {
  success: boolean
  payments: TPayment[]
  rawContent?: string
  error?: ErrorCode
}

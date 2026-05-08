export type TPayment = {
  amount: number
  address: string
  description?: string
}

export type TPaymentResponse = {
  payments: TPayment[]
}

export type TUploadResult = {
  success: boolean
  payments: TPayment[]
  rawContent?: string
  error?: string
}

export type TSupportedFileType = 'csv' | 'xlsx' | 'pdf' | 'txt'

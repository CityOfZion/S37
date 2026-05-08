import axios, { isAxiosError } from 'axios'

import type { TUploadResult } from 'fractapay-shared'
import { ErrorCode } from 'fractapay-shared'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
})

export async function uploadPaymentFile(file: File): Promise<TUploadResult> {
  const formData = new FormData()

  formData.append('file', file)

  try {
    const response = await api.post<TUploadResult>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return response.data
  } catch (error) {
    if (isAxiosError(error) && error.response?.data) {
      return error.response.data as TUploadResult
    }

    return { success: false, payments: [], error: ErrorCode.NETWORK_ERROR }
  }
}

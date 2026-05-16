import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

import type { TUploadPayload, TUploadResult } from 'fractapay-shared'
import { ErrorCode } from 'fractapay-shared'

import { server } from '../services/server'

export function useUploadMutation() {
  return useMutation<TUploadResult, Error, TUploadPayload>({
    mutationFn: async ({ file, token, address }: TUploadPayload) => {
      const formData = new FormData()

      formData.append('address', address)
      formData.append('token', token)
      formData.append('file', file)

      try {
        const response = await server.post<TUploadResult>(`/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })

        return response.data
      } catch (error) {
        if (isAxiosError(error) && error.response?.data) {
          return error.response.data as TUploadResult
        }

        return { success: false, payments: [], price: '0', error: ErrorCode.NETWORK_ERROR }
      }
    },
  })
}

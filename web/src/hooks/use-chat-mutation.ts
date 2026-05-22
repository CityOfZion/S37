import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

import type { TChatResponse } from 'fractapay-shared'
import type { TDestination, TDestinationAllocation, TLanguage, TPayment } from 'fractapay-shared'
import { ErrorCode } from 'fractapay-shared'

import { server } from '../services/server'

type TChatMutationInput = {
  messages: { role: 'user' | 'assistant'; content: string }[]
  destinations: TDestination[]
  payments: TPayment[]
  allocations: TDestinationAllocation[]
  language: TLanguage
  file?: File
}

export function useChatMutation() {
  return useMutation<TChatResponse, Error, TChatMutationInput>({
    mutationFn: async (input: TChatMutationInput) => {
      const formData = new FormData()

      formData.append('messages', JSON.stringify(input.messages))
      formData.append(
        'context',
        JSON.stringify({
          destinations: input.destinations,
          payments: input.payments,
          allocations: input.allocations,
          language: input.language,
        })
      )

      if (input.file) {
        formData.append('file', input.file)
      } else {
        formData.append('file', new Blob(), '')
      }

      try {
        const response = await server.post<TChatResponse>('/chat', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })

        return response.data
      } catch (error) {
        if (isAxiosError(error) && error.response?.data) {
          return error.response.data as TChatResponse
        }

        return {
          message: '',
          action: 'none' as const,
          error: ErrorCode.NETWORK_ERROR,
        }
      }
    },
  })
}

import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

import type {
  TChatDestination,
  TChatMessageHistory,
  TChatResponse,
  TDestination,
  TLanguage,
  TPaymentItem,
} from 'fractapay-shared'
import { EErrorCode } from 'fractapay-shared'

import { server } from '../services/server'

type TChatInputMutation = {
  messages: TChatMessageHistory[]
  destinations: TDestination[]
  payments: TPaymentItem[]
  chatDestinations: TChatDestination[]
  language: TLanguage
  file?: File
}

export function useChatMutation() {
  return useMutation<TChatResponse, Error, TChatInputMutation>({
    mutationFn: async (input: TChatInputMutation) => {
      const formData = new FormData()

      formData.append('messages', JSON.stringify(input.messages))
      formData.append(
        'context',
        JSON.stringify({
          destinations: input.destinations,
          payments: input.payments,
          chatDestinations: input.chatDestinations,
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
          text: '',
          action: 'NONE' as const,
          errorCode: EErrorCode.NETWORK_ERROR,
        }
      }
    },
  })
}

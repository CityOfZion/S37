import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

import {
  EErrorCode,
  type TSignupRequestPayload,
  type TSignupRequestResponse,
} from 'fractapay-shared'

import { server } from '../services/server'

export function useSignupRequestMutation() {
  return useMutation<TSignupRequestResponse, Error, TSignupRequestPayload>({
    mutationFn: async payload => {
      try {
        const { data } = await server.post<TSignupRequestResponse>('/auth/signup/request', payload)

        return data
      } catch (error) {
        if (isAxiosError(error) && error.response?.data) {
          return error.response.data as TSignupRequestResponse
        }

        return { success: false, error: EErrorCode.NETWORK_ERROR }
      }
    },
  })
}

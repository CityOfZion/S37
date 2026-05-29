import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

import { ErrorCode, type TSignupRequestPayload, type TSignupRequestResult } from 'fractapay-shared'

import { server } from '../services/server'

export function useSignupRequestMutation() {
  return useMutation<TSignupRequestResult, Error, TSignupRequestPayload>({
    mutationFn: async payload => {
      try {
        const { data } = await server.post<TSignupRequestResult>('/auth/signup/request', payload)

        return data
      } catch (error) {
        if (isAxiosError(error) && error.response?.data) {
          return error.response.data as TSignupRequestResult
        }

        return { success: false, error: ErrorCode.NETWORK_ERROR }
      }
    },
  })
}

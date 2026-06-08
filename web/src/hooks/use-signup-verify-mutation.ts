import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

import { EErrorCode, type TSignupVerifyPayload, type TSignupVerifyResponse } from 'fractapay-shared'

import { AUTH_TOKEN_STORAGE_KEY } from '../constants'
import { server } from '../services/server'
import { USER_QUERY_KEY } from './use-user-query'

export function useSignupVerifyMutation() {
  const queryClient = useQueryClient()

  return useMutation<TSignupVerifyResponse, Error, TSignupVerifyPayload>({
    mutationFn: async payload => {
      try {
        const { data } = await server.post<TSignupVerifyResponse>('/auth/signup/verify', payload)

        return data
      } catch (error) {
        if (isAxiosError(error) && error.response?.data) {
          return error.response.data as TSignupVerifyResponse
        }

        return { success: false, error: EErrorCode.NETWORK_ERROR }
      }
    },
    onSuccess: result => {
      if ('error' in result) return

      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, result.token)
      queryClient.setQueryData(USER_QUERY_KEY, result.user)
    },
  })
}

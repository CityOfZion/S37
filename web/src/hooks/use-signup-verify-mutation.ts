import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

import { ErrorCode, type TSignupVerifyPayload, type TSignupVerifyResult } from 'fractapay-shared'

import { AUTH_TOKEN_STORAGE_KEY } from '../constants'
import { server } from '../services/server'
import { USER_QUERY_KEY } from './use-user-query'

export function useSignupVerifyMutation() {
  const queryClient = useQueryClient()

  return useMutation<TSignupVerifyResult, Error, TSignupVerifyPayload>({
    mutationFn: async payload => {
      try {
        const { data } = await server.post<TSignupVerifyResult>('/auth/signup/verify', payload)

        return data
      } catch (error) {
        if (isAxiosError(error) && error.response?.data) {
          return error.response.data as TSignupVerifyResult
        }

        return { success: false, error: ErrorCode.NETWORK_ERROR }
      }
    },
    onSuccess: result => {
      if (!result.success) return

      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, result.token)
      queryClient.setQueryData(USER_QUERY_KEY, result.user)
    },
  })
}

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { type TSignupVerifyPayload, type TSignupVerifyResponse } from 'fractapay-shared'

import { AUTH_TOKEN_STORAGE_KEY } from '../constants'
import { server } from '../services/server'
import { USER_QUERY_KEY } from './use-user-query'

type TSignupVerifySuccessResponse = Extract<TSignupVerifyResponse, { token: string }>

export function useSignupVerifyMutation() {
  const queryClient = useQueryClient()

  return useMutation<TSignupVerifySuccessResponse, Error, TSignupVerifyPayload>({
    mutationFn: async payload => {
      const { data } = await server.post<TSignupVerifySuccessResponse>(
        '/auth/signup/verify',
        payload
      )

      return data
    },
    onSuccess: result => {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, result.token)
      queryClient.setQueryData(USER_QUERY_KEY, result.user)
    },
  })
}

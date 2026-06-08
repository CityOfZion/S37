import { useMutation, useQueryClient } from '@tanstack/react-query'

import { type TPasskeyLoginResponse } from 'fractapay-shared'

import { AUTH_TOKEN_STORAGE_KEY } from '../constants'
import { server } from '../services/server'
import { useSmartAccount } from './use-smart-account'
import { USER_QUERY_KEY } from './use-user-query'

type TPasskeyLoginSuccessResponse = Extract<TPasskeyLoginResponse, { token: string }>

export function usePasskeyLoginMutation() {
  const queryClient = useQueryClient()
  const { connectExistingWallet } = useSmartAccount()

  return useMutation<TPasskeyLoginSuccessResponse, Error>({
    mutationFn: async () => {
      const { contractId } = await connectExistingWallet()
      const { data } = await server.post<TPasskeyLoginSuccessResponse>('/auth/passkey/login', {
        address: contractId,
      })

      return data
    },
    onSuccess: result => {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, result.token)
      queryClient.setQueryData(USER_QUERY_KEY, result.user)
    },
  })
}

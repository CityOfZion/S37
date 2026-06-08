import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

import { EErrorCode, type TPasskeyLoginResponse } from 'fractapay-shared'

import { AUTH_TOKEN_STORAGE_KEY } from '../constants'
import { server } from '../services/server'
import { useSmartAccount } from './use-smart-account'
import { USER_QUERY_KEY } from './use-user-query'

export function usePasskeyLoginMutation() {
  const queryClient = useQueryClient()
  const { connectExistingWallet } = useSmartAccount()

  return useMutation<TPasskeyLoginResponse, Error>({
    mutationFn: async () => {
      const { contractId } = await connectExistingWallet()

      try {
        const { data } = await server.post<TPasskeyLoginResponse>('/auth/passkey/login', {
          address: contractId,
        })

        return data
      } catch (error) {
        if (isAxiosError(error) && error.response?.data) {
          return error.response.data as TPasskeyLoginResponse
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

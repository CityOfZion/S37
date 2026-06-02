import { useMutation, useQueryClient } from '@tanstack/react-query'

import { AUTH_TOKEN_STORAGE_KEY } from '../constants'
import { server } from '../services/server'
import { useChatStore } from './use-chat-store'
import { useKycStore } from './use-kyc-store'
import { usePaymentsStore } from './use-payments-store'
import { USER_QUERY_KEY } from './use-user-query'

export function useLogoutMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      try {
        await server.post('/auth/logout')
      } catch {
        /* empty */
      }

      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    },
    onSuccess: () => {
      useChatStore.getState().reset()
      useKycStore.getState().reset()
      usePaymentsStore.getState().setAddress('')
      queryClient.clear()
      queryClient.removeQueries({ queryKey: USER_QUERY_KEY })
    },
  })
}

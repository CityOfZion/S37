import { useMutation, useQueryClient } from '@tanstack/react-query'

import { AUTH_TOKEN_STORAGE_KEY } from '../constants'
import { server } from '../services/server'
import { useChatStore } from './use-chat-store'
import { useEtherfuseStore } from './use-etherfuse-store'
import { usePaymentsStore } from './use-payments-store'
import { USER_QUERY_KEY } from './use-user-query'

export function useLogoutMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      try {
        await server.post('/auth/logout')
      } catch {
        // ignore — server logout is best-effort with stateless JWT
      }

      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    },
    onSuccess: () => {
      useChatStore.getState().reset()
      useEtherfuseStore.getState().reset()
      const payments = usePaymentsStore.getState()
      payments.setPayments([])
      payments.setAddress('')
      payments.setPrice('0')
      queryClient.removeQueries({ queryKey: USER_QUERY_KEY })
    },
  })
}

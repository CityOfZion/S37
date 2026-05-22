import { useMutation, useQueryClient } from '@tanstack/react-query'

import { server } from '../services/server'
import { useChatStore } from './use-chat-store'
import { useEtherfuseStore } from './use-etherfuse-store'
import { usePaymentsStore } from './use-payments-store'
import { USER_QUERY_KEY } from './use-user-query'

export function useLogoutMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await server.post('/auth/logout')
    },
    onSuccess: () => {
      useChatStore.getState().reset()
      useEtherfuseStore.getState().reset()
      const payments = usePaymentsStore.getState()
      payments.setPayments([])
      payments.setAddress('')
      payments.setPrice('0')
      queryClient.setQueryData(USER_QUERY_KEY, null)
    },
  })
}

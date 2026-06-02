import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { TCreatePaymentPayload, TPayment } from 'fractapay-shared'

import { server } from '../services/server'
import { PAYMENT_QUERY_KEY } from './use-payment-query'
import { PAYMENTS_QUERY_KEY } from './use-payments-query'

export function useCreatePaymentMutation() {
  const queryClient = useQueryClient()

  return useMutation<TPayment, Error, TCreatePaymentPayload>({
    mutationFn: async payload => {
      const { data } = await server.post<TPayment>('/payments', payload)

      return data
    },
    onSuccess: payment => {
      queryClient.setQueryData([PAYMENT_QUERY_KEY, payment.id], payment)
      queryClient.invalidateQueries({ queryKey: [PAYMENTS_QUERY_KEY] })
    },
  })
}

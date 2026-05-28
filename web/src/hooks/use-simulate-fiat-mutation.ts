import { useMutation } from '@tanstack/react-query'

import { server } from '../services/server'

export function usePaymentSimulateMutation() {
  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await server.post(`/payments/${encodeURIComponent(id)}/simulate`)
    },
  })
}

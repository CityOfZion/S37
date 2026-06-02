import { useMutation } from '@tanstack/react-query'

import { server } from '../services/server'

export function usePaymentSimulateMutation() {
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (id: string) => {
      const { data } = await server.post<{ success: boolean }>(
        `/payments/${encodeURIComponent(id)}/simulate`
      )

      return data
    },
  })
}

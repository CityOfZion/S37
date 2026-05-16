import { useMutation } from '@tanstack/react-query'

import { server } from '../services/server'

export function useSimulateFiatMutation() {
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async orderId => {
      const { data } = await server.post<{ success: boolean }>(
        `/etherfuse/order/${encodeURIComponent(orderId)}/simulate`
      )

      return data
    },
  })
}

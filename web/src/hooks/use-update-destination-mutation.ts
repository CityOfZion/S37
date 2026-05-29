import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { TUpdateDestinationPayload, TUpdateDestinationResult } from 'fractapay-shared'

import { server } from '../services/server'
import { useDestinationsStore } from './use-destinations-store'

type TParams = {
  id: string
} & TUpdateDestinationPayload

export function useUpdateDestinationMutation() {
  const updateDestination = useDestinationsStore(state => state.updateDestination)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }: TParams) => {
      const response = await server.patch<TUpdateDestinationResult>(`/destinations/${id}`, payload)

      return response.data
    },
    onSuccess: data => {
      if (data.success) {
        updateDestination(data.destination)
        void queryClient.invalidateQueries({ queryKey: ['destinations'] })
      }
    },
  })
}

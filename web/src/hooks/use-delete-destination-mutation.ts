import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { TDeleteDestinationResult } from 'fractapay-shared'

import { server } from '../services/server'
import { useDestinationsStore } from './use-destinations-store'

export function useDeleteDestinationMutation() {
  const deleteDestination = useDestinationsStore(state => state.deleteDestination)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await server.delete<TDeleteDestinationResult>(`/destinations/${id}`)

      return { ...response.data, id }
    },
    onSuccess: data => {
      if (data.success) {
        deleteDestination(data.id)
        void queryClient.invalidateQueries({ queryKey: ['destinations'] })
      }
    },
  })
}

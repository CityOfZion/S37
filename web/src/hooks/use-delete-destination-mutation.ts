import { useMutation, useQueryClient } from '@tanstack/react-query'

import { server } from '../services/server'
import { DESTINATIONS_QUERY_KEY } from './use-destinations-query'
import { useDestinationsStore } from './use-destinations-store'

export function useDeleteDestinationMutation() {
  const deleteDestination = useDestinationsStore(state => state.deleteDestination)
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: async id => {
      await server.delete(`/destinations/${id}`)
    },
    onSuccess: (_, id) => {
      deleteDestination(id)

      void queryClient.invalidateQueries({ queryKey: [DESTINATIONS_QUERY_KEY] })
    },
  })
}

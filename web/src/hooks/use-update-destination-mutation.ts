import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { TDestination, TUpdateDestinationPayload } from 'fractapay-shared'

import { server } from '../services/server'
import { DESTINATIONS_QUERY_KEY } from './use-destinations-query'
import { useDestinationsStore } from './use-destinations-store'

type TUpdateDestinationParams = { id: string } & TUpdateDestinationPayload

export function useUpdateDestinationMutation() {
  const updateDestination = useDestinationsStore(state => state.updateDestination)
  const queryClient = useQueryClient()

  return useMutation<TDestination, Error, TUpdateDestinationParams>({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await server.patch<TDestination>(`/destinations/${id}`, payload)

      return data
    },
    onSuccess: destination => {
      updateDestination(destination)

      void queryClient.invalidateQueries({ queryKey: [DESTINATIONS_QUERY_KEY] })
    },
  })
}

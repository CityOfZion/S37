import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { TCreateDestinationPayload, TDestination } from 'fractapay-shared'

import { server } from '../services/server'
import { DESTINATIONS_QUERY_KEY } from './use-destinations-query'
import { useDestinationsStore } from './use-destinations-store'

export function useAddDestinationMutation() {
  const addDestination = useDestinationsStore(state => state.addDestination)
  const queryClient = useQueryClient()

  return useMutation<TDestination, Error, TCreateDestinationPayload>({
    mutationFn: async payload => {
      const { data } = await server.post<TDestination>('/destinations', payload)

      return data
    },
    onSuccess: destination => {
      addDestination(destination)

      void queryClient.invalidateQueries({ queryKey: [DESTINATIONS_QUERY_KEY] })
    },
  })
}

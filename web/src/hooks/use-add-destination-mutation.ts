import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { TCreateDestinationPayload, TCreateDestinationResult } from 'fractapay-shared'

import { server } from '../services/server'
import { useDestinationsStore } from './use-destinations-store'

export function useAddDestinationMutation() {
  const addDestination = useDestinationsStore(state => state.addDestination)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: TCreateDestinationPayload) => {
      const response = await server.post<TCreateDestinationResult>('/destinations', payload)

      return response.data
    },
    onSuccess: data => {
      if (data.success) {
        addDestination(data.destination)
        void queryClient.invalidateQueries({ queryKey: ['destinations'] })
      }
    },
  })
}

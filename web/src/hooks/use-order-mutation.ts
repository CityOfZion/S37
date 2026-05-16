import { useMutation } from '@tanstack/react-query'

import type { TOrderPayload, TOrderResult } from 'fractapay-shared'

import { server } from '../services/server'

export function useOrderMutation() {
  return useMutation<TOrderResult, Error, TOrderPayload>({
    mutationFn: async payload => {
      const { data } = await server.post<TOrderResult>('/etherfuse/order', payload)

      return data
    },
  })
}

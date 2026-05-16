import { useMutation } from '@tanstack/react-query'

import type { TQuotePayload, TQuoteResult } from 'fractapay-shared'

import { server } from '../services/server'

export function useQuoteMutation() {
  return useMutation<TQuoteResult, Error, TQuotePayload>({
    mutationFn: async payload => {
      const { data } = await server.post<TQuoteResult>('/etherfuse/quote', payload)

      return data
    },
  })
}

import { useQuery } from '@tanstack/react-query'

import type { TOrderResult } from 'fractapay-shared'

import { server } from '../services/server'

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'refunded', 'canceled'])

export function useOrderQuery(orderId: string) {
  return useQuery<TOrderResult>({
    queryKey: ['order', orderId],
    enabled: !!orderId,
    refetchInterval: data =>
      data.state.data && TERMINAL_STATUSES.has(data.state.data.status) ? false : 5000,
    queryFn: async () => {
      const { data } = await server.get<TOrderResult>(
        `/etherfuse/order/${encodeURIComponent(orderId)}`
      )

      return data
    },
  })
}

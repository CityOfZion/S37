import { useQuery } from '@tanstack/react-query'

import type { TBalanceResult } from 'fractapay-shared'

import { server } from '../services/server'

type TParams = {
  address: string
  enabled?: boolean
}

export function useBalanceQuery({ address, enabled = true }: TParams) {
  return useQuery<TBalanceResult | null>({
    queryKey: ['balance', address],
    enabled: enabled && !!address,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: false,
    queryFn: async () => {
      try {
        const { data } = await server.get<TBalanceResult>(`/balance/${encodeURIComponent(address)}`)

        return data
      } catch {
        return null
      }
    },
  })
}

import { useQuery } from '@tanstack/react-query'

import type { TBalanceResult } from 'fractapay-shared'

import { server } from '../services/server'

type TParams = {
  publicKey: string
  enabled?: boolean
}

export function useBalanceQuery({ publicKey, enabled = true }: TParams) {
  return useQuery<TBalanceResult | null>({
    queryKey: ['balance', publicKey],
    enabled: enabled && !!publicKey,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: false,
    queryFn: async () => {
      try {
        const { data } = await server.get<TBalanceResult>(
          `/balance/${encodeURIComponent(publicKey)}`
        )

        return data
      } catch {
        return null
      }
    },
  })
}

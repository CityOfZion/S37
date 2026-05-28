import { useQuery } from '@tanstack/react-query'

import type { TOnboardingResult } from 'fractapay-shared'

import { server } from '../services/server'

type TParams = {
  publicKey: string
  enabled?: boolean
}

export function useCustomerLookupQuery({ publicKey, enabled = true }: TParams) {
  return useQuery<TOnboardingResult | null>({
    queryKey: ['etherfuse-customer', publicKey],
    enabled: enabled && !!publicKey,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      try {
        const { data } = await server.get<TOnboardingResult>(
          `/etherfuse/customer/${encodeURIComponent(publicKey)}`
        )

        return data
      } catch {
        return null
      }
    },
  })
}

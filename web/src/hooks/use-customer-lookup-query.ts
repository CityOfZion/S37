import { useQuery } from '@tanstack/react-query'

import type { TOnboardingResult } from 'fractapay-shared'

import { server } from '../services/server'

type TParams = {
  address: string
  enabled?: boolean
}

export function useCustomerLookupQuery({ address, enabled = true }: TParams) {
  return useQuery<TOnboardingResult | null>({
    queryKey: ['etherfuse-customer', address],
    enabled: enabled && !!address,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      try {
        const { data } = await server.get<TOnboardingResult>(
          `/etherfuse/customer/${encodeURIComponent(address)}`
        )

        return data
      } catch {
        return null
      }
    },
  })
}

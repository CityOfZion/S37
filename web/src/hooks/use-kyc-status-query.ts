import { useQuery } from '@tanstack/react-query'

import type { TKycStatusResponse } from 'fractapay-shared'

import { server } from '../services/server'

type TParams = {
  externalCustomerId: string
  address: string
  enabled?: boolean
}

export function useKycStatusQuery({ externalCustomerId, address, enabled = true }: TParams) {
  return useQuery<TKycStatusResponse>({
    queryKey: ['kyc-status', externalCustomerId, address],
    enabled: enabled && !!externalCustomerId && !!address,
    refetchInterval: data =>
      data.state.data?.status === 'APPROVED' || data.state.data?.status === 'REJECTED'
        ? false
        : 5000,
    queryFn: async () => {
      const { data } = await server.get<TKycStatusResponse>(
        `/kyc/${encodeURIComponent(externalCustomerId)}/${encodeURIComponent(address)}`
      )

      return data
    },
  })
}

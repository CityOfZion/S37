import { useQuery } from '@tanstack/react-query'

import type { TKycStatusResponse } from 'fractapay-shared'

import { server } from '../services/server'

type TParams = {
  customerId: string
  address: string
  enabled?: boolean
}

export function useKycStatusQuery({ customerId, address, enabled = true }: TParams) {
  return useQuery<TKycStatusResponse>({
    queryKey: ['kyc-status', customerId, address],
    enabled: enabled && !!customerId && !!address,
    refetchInterval: data =>
      data.state.data?.status === 'APPROVED' || data.state.data?.status === 'REJECTED'
        ? false
        : 5000,
    queryFn: async () => {
      const { data } = await server.get<TKycStatusResponse>(
        `/kyc/${encodeURIComponent(customerId)}/${encodeURIComponent(address)}`
      )

      return data
    },
  })
}

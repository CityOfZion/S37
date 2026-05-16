import { useQuery } from '@tanstack/react-query'

import type { TKycStatusResult } from 'fractapay-shared'

import { server } from '../services/server'

type TParams = {
  customerId: string
  publicKey: string
  enabled?: boolean
}

export function useKycStatusQuery({ customerId, publicKey, enabled = true }: TParams) {
  return useQuery<TKycStatusResult>({
    queryKey: ['kyc-status', customerId, publicKey],
    enabled: enabled && !!customerId && !!publicKey,
    refetchInterval: data =>
      data.state.data?.status === 'approved' || data.state.data?.status === 'rejected'
        ? false
        : 5000,
    queryFn: async () => {
      const { data } = await server.get<TKycStatusResult>(
        `/etherfuse/kyc/${encodeURIComponent(customerId)}/${encodeURIComponent(publicKey)}`
      )

      return data
    },
  })
}

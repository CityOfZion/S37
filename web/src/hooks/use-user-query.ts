import { useQuery } from '@tanstack/react-query'

import type { TAuthMeResult, TUser } from 'fractapay-shared'

import { server } from '../services/server'

export const USER_QUERY_KEY = ['auth', 'me'] as const

export function useUserQuery() {
  return useQuery<TUser | null>({
    queryKey: USER_QUERY_KEY,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      try {
        const { data } = await server.get<TAuthMeResult>('/auth/me')

        return data.success ? data.user : null
      } catch {
        return null
      }
    },
  })
}

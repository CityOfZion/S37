import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { TAuthMeResult, TCompleteOnboardingPayload, TUser } from 'fractapay-shared'

import { server } from '../services/server'
import { USER_QUERY_KEY } from './use-user-query'

export function useCompleteOnboardingMutation() {
  const queryClient = useQueryClient()

  return useMutation<TUser, Error, TCompleteOnboardingPayload>({
    mutationFn: async payload => {
      const { data } = await server.post<TAuthMeResult>('/auth/onboarding', payload)

      if (!data.success) {
        throw new Error(data.error)
      }

      return data.user
    },
    onSuccess: user => {
      queryClient.setQueryData(USER_QUERY_KEY, user)
    },
  })
}

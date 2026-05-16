import { useMutation } from '@tanstack/react-query'

import type { TOnboardingPayload, TOnboardingResult } from 'fractapay-shared'

import { server } from '../services/server'

export function useOnboardingMutation() {
  return useMutation<TOnboardingResult, Error, TOnboardingPayload>({
    mutationFn: async payload => {
      const { data } = await server.post<TOnboardingResult>('/etherfuse/onboarding', payload)

      return data
    },
  })
}

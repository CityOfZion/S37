import { useMutation } from '@tanstack/react-query'

import type { TOrganizationPayload, TOrganizationResult } from 'fractapay-shared'

import { server } from '../services/server'

export function useCreateOrganizationMutation() {
  return useMutation<TOrganizationResult, Error, TOrganizationPayload>({
    mutationFn: async payload => {
      const { data } = await server.post<TOrganizationResult>('/etherfuse/organization', payload)

      return data
    },
  })
}

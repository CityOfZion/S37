import { useMutation } from '@tanstack/react-query'

import { type TSignupRequestPayload, type TSignupRequestResponse } from 'fractapay-shared'

import { server } from '../services/server'

type TSignupRequestSuccessResponse = Extract<TSignupRequestResponse, { expiresAt: string }>

export function useSignupRequestMutation() {
  return useMutation<TSignupRequestSuccessResponse, Error, TSignupRequestPayload>({
    mutationFn: async payload => {
      const { data } = await server.post<TSignupRequestSuccessResponse>(
        '/auth/signup/request',
        payload
      )

      return data
    },
  })
}

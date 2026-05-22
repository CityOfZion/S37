import { useMutation } from '@tanstack/react-query'
import axios, { type AxiosError } from 'axios'

import { ErrorCode } from 'fractapay-shared'

import { server } from '../services/server'

type TSignupErrorResponse = { success: false; error: ErrorCode }

export type TSignupResult = { kind: 'not-implemented' } | { kind: 'error'; error: ErrorCode }

export function useSignupMutation() {
  return useMutation<TSignupResult, Error, void>({
    mutationFn: async () => {
      try {
        await server.post('/auth/signup')

        return { kind: 'error', error: ErrorCode.UNKNOWN }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const response = (error as AxiosError<TSignupErrorResponse>).response

          if (response?.status === 501 && response.data?.error === ErrorCode.NOT_IMPLEMENTED) {
            return { kind: 'not-implemented' }
          }

          if (response?.data?.error) {
            return { kind: 'error', error: response.data.error }
          }
        }

        return { kind: 'error', error: ErrorCode.NETWORK_ERROR }
      }
    },
  })
}

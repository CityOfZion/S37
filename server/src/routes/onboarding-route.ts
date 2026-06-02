import type { FastifyInstance } from 'fastify'

import type { TOnboardingPayload } from 'fractapay-shared'
import { EErrorCode, ErrorHelper, StellarHelper } from 'fractapay-shared'

import { requireAuth } from '../hooks/require-auth'
import { createOnboarding } from '../services/etherfuse-service'

type TOnboardingParams = { Body: TOnboardingPayload }

export const onboardingRoute = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post<TOnboardingParams>(
    '/onboarding',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { address } = request.body || {}

      if (!address || !StellarHelper.isValidAddress(address)) {
        return reply.status(400).send({ error: EErrorCode.INVALID_ADDRESS })
      }

      try {
        const response = await createOnboarding(address)

        return reply.status(200).send(response)
      } catch (error) {
        return reply.status(502).send({ error: ErrorHelper.map(error) })
      }
    }
  )
}

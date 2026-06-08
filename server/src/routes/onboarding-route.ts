import type { FastifyInstance } from 'fastify'

import { TOnboardingPayload } from 'fractapay-shared'
import { EErrorCode, ErrorHelper } from 'fractapay-shared'

import { requireAuth } from '../hooks/require-auth'
import { onboardingSchema } from '../schemas/onboarding-schema'
import { createOnboarding } from '../services/etherfuse-service'

type TOnboardingParams = { Body: TOnboardingPayload }

export const onboardingRoute = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post<TOnboardingParams>(
    '/onboarding',
    { preHandler: requireAuth },
    async (request, reply) => {
      const body = request.body
      const parsed = onboardingSchema.safeParse(body)

      if (!parsed.success) {
        return reply.status(400).send({ error: EErrorCode.INVALID_ADDRESS })
      }

      try {
        const response = await createOnboarding(parsed.data.address)

        return reply.status(200).send(response)
      } catch (error) {
        return reply.status(502).send({ error: ErrorHelper.map(error) })
      }
    }
  )
}

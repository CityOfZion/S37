import type { FastifyInstance } from 'fastify'

import { EErrorCode, ErrorHelper, StellarHelper } from 'fractapay-shared'

import { requireAuth } from '../hooks/require-auth'
import { getKycStatus } from '../services/etherfuse-service'

type TKycParams = { Params: { customerId: string; address: string } }

export const kycRoute = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get<TKycParams>(
    '/kyc/:customerId/:address',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { customerId, address } = request.params

      if (!StellarHelper.isValidAddress(address)) {
        return reply.status(400).send({ error: EErrorCode.INVALID_ADDRESS })
      }

      try {
        const response = await getKycStatus(customerId, address)

        return reply.status(200).send(response)
      } catch (error) {
        return reply.status(502).send({ error: ErrorHelper.map(error) })
      }
    }
  )
}

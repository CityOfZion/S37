import type { FastifyInstance } from 'fastify'

import { EErrorCode, ErrorHelper } from 'fractapay-shared'

import { requireAuth } from '../hooks/require-auth'
import { kycSchema } from '../schemas/kyc-schema'
import { getKycStatus, upsertCustomer } from '../services/etherfuse-service'

type TKycParams = { Params: { customerId: string; address: string } }

export const kycRoute = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get<TKycParams>(
    '/kyc/:customerId/:address',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = kycSchema.safeParse(request.params)

      if (!parsed.success) {
        return reply.status(400).send({ error: EErrorCode.INVALID_ADDRESS })
      }

      try {
        const { customerId, address } = parsed.data

        const response = await getKycStatus(customerId, address)

        if (response.status === 'APPROVED') {
          try {
            await upsertCustomer({ customerId, address })
          } catch {
            /* empty */
          }
        }

        return reply.status(200).send(response)
      } catch (error) {
        return reply.status(502).send({ error: ErrorHelper.map(error) })
      }
    }
  )
}

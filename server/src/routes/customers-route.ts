import type { FastifyInstance } from 'fastify'

import { EErrorCode, ErrorHelper, StellarHelper } from 'fractapay-shared'

import { requireAuth } from '../hooks/require-auth'
import { findCustomerByAddress } from '../services/etherfuse-service'

type TCustomerParams = { Params: { address: string } }

export const customersRoute = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get<TCustomerParams>(
    '/customer/:address',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { address } = request.params

      if (!StellarHelper.isValidAddress(address)) {
        return reply.status(400).send({ error: EErrorCode.INVALID_ADDRESS })
      }

      try {
        const response = await findCustomerByAddress(address)

        if (!response) {
          return reply.status(404).send({ error: EErrorCode.CUSTOMER_NOT_FOUND })
        }

        return reply.status(200).send(response)
      } catch (error) {
        return reply.status(502).send({ error: ErrorHelper.map(error) })
      }
    }
  )
}

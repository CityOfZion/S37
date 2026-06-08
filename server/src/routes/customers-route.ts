import type { FastifyInstance } from 'fastify'

import { EErrorCode, ErrorHelper } from 'fractapay-shared'

import { requireAuth } from '../hooks/require-auth'
import { customersSchema } from '../schemas/customers-schema'
import {
  findCustomerByAddressFromDatabase,
  getCustomerBankAccountId,
} from '../services/etherfuse-service'

type TCustomerParams = { Params: { address: string } }

export const customersRoute = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get<TCustomerParams>(
    '/customer/:address',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = customersSchema.safeParse(request.params)

      if (!parsed.data) {
        return reply.status(400).send({ error: EErrorCode.INVALID_ADDRESS })
      }

      try {
        const customer = await findCustomerByAddressFromDatabase(parsed.data.address)

        if (customer) {
          const bankAccountId =
            customer.bankAccountId || (await getCustomerBankAccountId(customer.customerId))

          if (bankAccountId) {
            return reply
              .status(200)
              .send({ customerId: customer.customerId, bankAccountId, presignedUrl: '' })
          }
        }

        return reply.status(404).send({ error: EErrorCode.CUSTOMER_NOT_FOUND })
      } catch (error) {
        return reply.status(502).send({ error: ErrorHelper.map(error) })
      }
    }
  )
}

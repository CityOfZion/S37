import type { FastifyInstance } from 'fastify'

import { EErrorCode, ErrorHelper } from 'fractapay-shared'

import { requireAuth } from '../hooks/require-auth'
import { customersSchema } from '../schemas/customers-schema'
import {
  findCustomerByAddress,
  findCustomerByAddressFromDatabase,
  getCustomerExternalBankAccountId,
  saveCustomer,
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
          const externalBankAccountId =
            customer.externalBankAccountId ||
            (await getCustomerExternalBankAccountId(customer.externalCustomerId))

          if (externalBankAccountId) {
            return reply.status(200).send({
              externalCustomerId: customer.externalCustomerId,
              externalBankAccountId,
              presignedUrl: '',
            })
          }
        }

        return reply.status(404).send({ error: EErrorCode.CUSTOMER_NOT_FOUND })
      } catch (error) {
        return reply.status(502).send({ error: ErrorHelper.map(error) })
      }
    }
  )

  fastify.post<TCustomerParams>(
    '/customer/:address',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = customersSchema.safeParse(request.params)

      if (!parsed.data) {
        return reply.status(400).send({ error: EErrorCode.INVALID_ADDRESS })
      }

      const { address } = parsed.data

      try {
        const existing = await findCustomerByAddressFromDatabase(address)

        if (existing) {
          const externalBankAccountId =
            existing.externalBankAccountId ||
            (await getCustomerExternalBankAccountId(existing.externalCustomerId))

          return reply.status(200).send({
            externalCustomerId: existing.externalCustomerId,
            externalBankAccountId: externalBankAccountId || '',
            presignedUrl: '',
          })
        }

        const remote = await findCustomerByAddress(address)

        if (!remote) {
          return reply.status(404).send({ error: EErrorCode.CUSTOMER_NOT_FOUND })
        }

        await saveCustomer({
          address,
          externalCustomerId: remote.externalCustomerId,
          externalBankAccountId: remote.externalBankAccountId,
        })

        return reply.status(200).send(remote)
      } catch (error) {
        return reply.status(502).send({ error: ErrorHelper.map(error) })
      }
    }
  )
}

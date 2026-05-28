import type { FastifyInstance } from 'fastify'

import { EErrorCode, ErrorHelper, TBalanceResponse } from 'fractapay-shared'

import { balanceSchema } from '../schemas/balances-schema'
import { getTesouroBalanceInBrl } from '../services/balance-service'

type TParams = {
  Params: { address: string }
  Reply: TBalanceResponse
}

export const balanceRoute = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get<TParams>('/balance/:address', async (request, reply) => {
    const parsed = balanceSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.status(400).send({ error: EErrorCode.INVALID_ADDRESS })
    }

    try {
      const result = await getTesouroBalanceInBrl(parsed.data.address)

      return reply.status(200).send(result)
    } catch (error) {
      return reply.status(502).send({ error: ErrorHelper.map(error) })
    }
  })
}

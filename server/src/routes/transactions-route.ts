import type { FastifyInstance } from 'fastify'

import { EErrorCode } from 'fractapay-shared'

import { requireAuth } from '../hooks/require-auth'
import { signAndSubmitTransaction } from '../services/etherfuse-service'

export const transactionsRoute = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post('/transactions/submit', { preHandler: requireAuth }, async (request, reply) => {
    const body = request.body as { transactionData?: string }

    if (!body?.transactionData) {
      return reply.status(400).send({ error: EErrorCode.INVALID_PAYLOAD })
    }

    try {
      const hash = await signAndSubmitTransaction(body.transactionData)

      return reply.send({ hash })
    } catch {
      return reply.status(502).send({ error: EErrorCode.UNKNOWN })
    }
  })
}

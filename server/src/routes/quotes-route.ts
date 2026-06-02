import type { FastifyInstance } from 'fastify'

import type { TQuotePayload } from 'fractapay-shared'
import { EErrorCode, ErrorHelper, StellarHelper, SUPPORTED_TOKENS } from 'fractapay-shared'

import { requireAuth } from '../hooks/require-auth'
import { createQuote } from '../services/etherfuse-service'

type TQuoteParams = { Body: TQuotePayload }

export const quotesRoute = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post<TQuoteParams>('/quote', { preHandler: requireAuth }, async (request, reply) => {
    const body = request.body

    if (
      !body?.customerId ||
      !body.sourceAmount ||
      !body.token ||
      !SUPPORTED_TOKENS.includes(body.token) ||
      !body.address ||
      !StellarHelper.isValidAddress(body.address)
    ) {
      return reply.status(400).send({ error: EErrorCode.INVALID_PAYLOAD })
    }

    try {
      const response = await createQuote(body)

      return reply.status(200).send(response)
    } catch (error) {
      return reply.status(502).send({ error: ErrorHelper.map(error) })
    }
  })
}

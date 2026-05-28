import type { FastifyInstance } from 'fastify'

import type { TQuotePayload } from 'fractapay-shared'
import { EErrorCode, ErrorHelper } from 'fractapay-shared'

import { requireAuth } from '../hooks/require-auth'
import { quoteSchema } from '../schemas/quotes-schema'
import { createQuote } from '../services/etherfuse-service'

type TQuoteParams = { Body: TQuotePayload }

export const quotesRoute = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post<TQuoteParams>('/quote', { preHandler: requireAuth }, async (request, reply) => {
    const body = request.body
    const parsed = quoteSchema.safeParse(body)

    if (!parsed.success) {
      return reply.status(400).send({ error: EErrorCode.INVALID_PAYLOAD })
    }

    try {
      const response = await createQuote(parsed.data)

      return reply.status(200).send(response)
    } catch (error) {
      return reply.status(502).send({ error: ErrorHelper.map(error) })
    }
  })
}

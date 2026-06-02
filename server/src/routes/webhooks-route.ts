import type { FastifyInstance } from 'fastify'

import { EErrorCode } from 'fractapay-shared'

import {
  recordWebhookEvent,
  type TEtherfuseWebhookEvent,
  type TEtherfuseWebhookPayload,
} from '../services/etherfuse-webhook-store'

const WEBHOOK_EVENTS: TEtherfuseWebhookEvent[] = [
  'bank_account_updated',
  'customer_updated',
  'order_updated',
  'quote_updated',
  'swap_updated',
  'kyc_updated',
]

export const webhooksRoute = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post('/webhook', async (request, reply) => {
    const body = request.body as TEtherfuseWebhookPayload

    if (
      !body?.event ||
      !WEBHOOK_EVENTS.includes(body.event) ||
      !body.data?.id ||
      typeof body.data.status !== 'string' ||
      !body.timestamp
    ) {
      return reply.status(400).send({ error: EErrorCode.INVALID_PAYLOAD })
    }

    recordWebhookEvent(body)

    return reply.status(200).send()
  })
}

import canonicalize from 'canonicalize'
import { createHmac, timingSafeEqual } from 'crypto'
import type { FastifyInstance } from 'fastify'

import { EErrorCode } from 'fractapay-shared'

import { EnvHelper } from '../helpers/EnvHelper'
import { updatePaymentById } from '../services/payments-service'

const verifySignature = (payload: unknown, signature: string): boolean => {
  if (!EnvHelper.ETHERFUSE_WEBHOOK_SECRET || !signature) return false

  const canonical = canonicalize(payload)

  if (!canonical) return false

  const key = Buffer.from(EnvHelper.ETHERFUSE_WEBHOOK_SECRET, 'base64')
  const expected = `sha256=${createHmac('sha256', key).update(canonical).digest('hex')}`
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(signature)

  if (expectedBuffer.length !== actualBuffer.length) return false

  return timingSafeEqual(expectedBuffer, actualBuffer)
}

export const webhooksRoute = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post('/webhook', async (request, reply) => {
    const body = request.body as Record<string, unknown> | undefined
    const signature = request.headers['x-signature'] as string | undefined

    if (!body || !signature || !verifySignature(body, signature)) {
      return reply.status(401).send({ error: EErrorCode.UNAUTHORIZED })
    }

    const order = body?.order_updated as Record<string, unknown> | undefined
    const id = order?.orderId as string | undefined
    const status = order?.status as string | undefined

    if (id && status) {
      if (order?.orderType === 'onramp' && order.amountInTokens && order.confirmedTxSignature) {
        await updatePaymentById({
          id,
          status,
          tokenAmount: order.amountInTokens as string,
          transactionHash: order.confirmedTxSignature as string,
        })
      } else if (
        order?.orderType === 'offramp' &&
        (order.burnTransaction || order.confirmedTxSignature)
      ) {
        await updatePaymentById({
          id,
          status,
          transactionData: order.burnTransaction as string | undefined,
          transactionHash: order.confirmedTxSignature as string | undefined,
        })
      }
    }

    return reply.status(200).send()
  })
}

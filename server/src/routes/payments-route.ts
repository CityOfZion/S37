import type { FastifyInstance } from 'fastify'

import type { TCreatePaymentPayload } from 'fractapay-shared'
import { EErrorCode, ErrorHelper } from 'fractapay-shared'

import { EncryptionHelper } from '../helpers/EncryptionHelper'
import { requireAuth } from '../hooks/require-auth'
import { createPaymentSchema, getPaymentsSchema } from '../schemas/payments-schema'
import { simulateFiatReceived } from '../services/etherfuse-service'
import { createPayment, getPaymentById, getPayments } from '../services/payments-service'
import { prisma } from '../services/prisma-service'

type TPaymentParams = { Params: { id: string } }

type TCreatePaymentParams = { Body: TCreatePaymentPayload }

export const paymentsRoute = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post<TCreatePaymentParams>(
    '/payments',
    { preHandler: requireAuth },
    async (request, reply) => {
      const result = createPaymentSchema.safeParse(request.body)

      if (!result.success) {
        return reply.status(400).send({ error: EErrorCode.INVALID_PAYLOAD })
      }

      try {
        const payment = await createPayment(request.user.id, result.data as TCreatePaymentPayload)

        return reply.status(201).send(payment)
      } catch (error) {
        const code = ErrorHelper.map(error)
        const status = code === EErrorCode.PENDING_ORDER_EXISTS ? 409 : 502

        return reply.status(status).send({ error: code })
      }
    }
  )

  fastify.get('/payments', { preHandler: requireAuth }, async (request, reply) => {
    const result = getPaymentsSchema.safeParse(request.query)

    if (!result.success) {
      return reply.status(400).send({ error: EErrorCode.INVALID_PAYLOAD })
    }

    try {
      const page = await getPayments(request.user.id, result.data)

      return reply.status(200).send(page)
    } catch {
      return reply.status(500).send({ error: EErrorCode.UNKNOWN })
    }
  })

  fastify.get<TPaymentParams>(
    '/payments/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const payment = await getPaymentById(request.params.id, request.user.id)

        if (!payment) {
          return reply.status(404).send({ error: EErrorCode.PAYMENT_NOT_FOUND })
        }

        return reply.status(200).send(payment)
      } catch {
        return reply.status(500).send({ error: EErrorCode.UNKNOWN })
      }
    }
  )

  // TODO: remove in Mainnet
  fastify.post<TPaymentParams>(
    '/payments/:id/simulate',
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const payment = await prisma.payment.findFirst({
          where: { id: request.params.id, userId: request.user.id },
        })

        if (!payment?.externalId) {
          return reply.status(404).send({ error: EErrorCode.PAYMENT_NOT_FOUND })
        }

        const externalId = EncryptionHelper.decrypt(payment.externalId)

        await simulateFiatReceived(externalId)

        return reply.status(204).send()
      } catch {
        return reply.status(502).send({ error: EErrorCode.UNKNOWN })
      }
    }
  )
}

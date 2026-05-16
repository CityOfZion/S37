import type { FastifyInstance } from 'fastify'

import type {
  TBankAccountPayload,
  TBankAccountResult,
  TKycStatusResult,
  TOnboardingPayload,
  TOnboardingResult,
  TOrderPayload,
  TOrderResult,
  TPixKeyType,
  TQuotePayload,
  TQuoteResult,
} from 'fractapay-shared'
import { ErrorCode, StellarHelper, SUPPORTED_TOKENS } from 'fractapay-shared'

import {
  createOnboarding,
  createOrder,
  createQuote,
  getKycStatus,
  getOrder,
  registerBankAccount,
  simulateFiatReceived,
} from '../services/etherfuse-service'
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

type TErrorResponse = { success: false; error: ErrorCode }

const PIX_KEY_TYPES: TPixKeyType[] = ['evp', 'cpf', 'cnpj', 'email', 'phone']

const sendError = (
  status: number,
  error: ErrorCode
): { statusCode: number; body: TErrorResponse } => ({
  statusCode: status,
  body: { success: false, error },
})

const mapError = (error: unknown): ErrorCode => {
  const message = (error as Error).message as ErrorCode
  return Object.values(ErrorCode).includes(message) ? message : ErrorCode.UNKNOWN
}

export const etherfuseRoute = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post<{ Body: TOnboardingPayload; Reply: TOnboardingResult | TErrorResponse }>(
    '/etherfuse/onboarding',
    async (request, reply) => {
      const { publicKey } = request.body ?? {}

      if (!publicKey || !StellarHelper.isValidAddress(publicKey)) {
        const { statusCode, body } = sendError(400, ErrorCode.INVALID_ADDRESS)
        return reply.status(statusCode).send(body)
      }

      try {
        const result = await createOnboarding(publicKey)
        return reply.status(200).send(result)
      } catch (error) {
        return reply.status(502).send({ success: false, error: mapError(error) })
      }
    }
  )

  fastify.get<{
    Params: { customerId: string; publicKey: string }
    Reply: TKycStatusResult | TErrorResponse
  }>('/etherfuse/kyc/:customerId/:publicKey', async (request, reply) => {
    const { customerId, publicKey } = request.params

    if (!StellarHelper.isValidAddress(publicKey)) {
      return reply.status(400).send({ success: false, error: ErrorCode.INVALID_ADDRESS })
    }

    try {
      const result = await getKycStatus(customerId, publicKey)
      return reply.status(200).send(result)
    } catch (error) {
      return reply.status(502).send({ success: false, error: mapError(error) })
    }
  })

  fastify.post<{ Body: TBankAccountPayload; Reply: TBankAccountResult | TErrorResponse }>(
    '/etherfuse/bank-account',
    async (request, reply) => {
      const body = request.body

      if (
        !body?.presignedUrl ||
        !body.pixKey ||
        !body.pixKeyType ||
        !PIX_KEY_TYPES.includes(body.pixKeyType) ||
        !body.firstName ||
        !body.lastName ||
        !body.cpf
      ) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
      }

      try {
        const result = await registerBankAccount(body)
        return reply.status(200).send(result)
      } catch (error) {
        return reply.status(502).send({ success: false, error: mapError(error) })
      }
    }
  )

  fastify.post<{ Body: TQuotePayload; Reply: TQuoteResult | TErrorResponse }>(
    '/etherfuse/quote',
    async (request, reply) => {
      const body = request.body

      if (
        !body?.customerId ||
        !body.sourceAmount ||
        !body.token ||
        !SUPPORTED_TOKENS.includes(body.token) ||
        !body.publicKey ||
        !StellarHelper.isValidAddress(body.publicKey)
      ) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
      }

      try {
        const result = await createQuote(body)
        return reply.status(200).send(result)
      } catch (error) {
        return reply.status(502).send({ success: false, error: mapError(error) })
      }
    }
  )

  fastify.post<{ Body: TOrderPayload; Reply: TOrderResult | TErrorResponse }>(
    '/etherfuse/order',
    async (request, reply) => {
      const body = request.body

      if (
        !body?.quoteId ||
        !body.customerId ||
        !body.bankAccountId ||
        !body.publicKey ||
        !StellarHelper.isValidAddress(body.publicKey)
      ) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
      }

      try {
        const result = await createOrder(body)
        return reply.status(200).send(result)
      } catch (error) {
        return reply.status(502).send({ success: false, error: mapError(error) })
      }
    }
  )

  fastify.get<{ Params: { orderId: string }; Reply: TOrderResult | TErrorResponse }>(
    '/etherfuse/order/:orderId',
    async (request, reply) => {
      try {
        const result = await getOrder(request.params.orderId)
        return reply.status(200).send(result)
      } catch (error) {
        const code = mapError(error)
        const status = code === ErrorCode.ORDER_NOT_FOUND ? 404 : 502
        return reply.status(status).send({ success: false, error: code })
      }
    }
  )

  fastify.post<{ Body: TEtherfuseWebhookPayload; Reply: { success: boolean } | TErrorResponse }>(
    '/etherfuse/webhook',
    async (request, reply) => {
      const body = request.body

      if (
        !body?.event ||
        !WEBHOOK_EVENTS.includes(body.event) ||
        !body.data?.id ||
        typeof body.data.status !== 'string' ||
        !body.timestamp
      ) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
      }

      recordWebhookEvent(body)
      request.log.info(
        { event: body.event, id: body.data.id, status: body.data.status },
        '[Etherfuse] webhook received'
      )

      return reply.status(200).send({ success: true })
    }
  )

  fastify.post<{ Params: { orderId: string }; Reply: { success: boolean } | TErrorResponse }>(
    '/etherfuse/order/:orderId/simulate',
    async (request, reply) => {
      try {
        await simulateFiatReceived(request.params.orderId)
        return reply.status(200).send({ success: true })
      } catch (error) {
        return reply.status(502).send({ success: false, error: mapError(error) })
      }
    }
  )
}

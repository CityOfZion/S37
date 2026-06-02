import type { FastifyInstance } from 'fastify'

import type {
  TBankAccountPayload,
  TBankAccountResult,
  TKycStatusResult,
  TOnboardingPayload,
  TOnboardingResult,
  TOrderPayload,
  TOrderResult,
  TOrganizationPayload,
  TOrganizationResult,
  TPixKeyType,
  TQuotePayload,
  TQuoteResult,
  TSubmitKycPayload,
  TSubmitKycResult,
} from 'fractapay-shared'
import { ErrorCode, StellarHelper, SUPPORTED_TOKENS } from 'fractapay-shared'

import {
  findEtherfuseCustomerByPublicKey,
  upsertEtherfuseCustomer,
} from '../services/etherfuse-customer-service'
import {
  createOnboarding,
  createOrder,
  createOrganization,
  createQuote,
  findCustomerByPublicKey,
  getCustomerBankAccountId,
  getKycStatus,
  getOrder,
  registerBankAccount,
  simulateFiatReceived,
  submitKyc,
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

      if (!publicKey || !StellarHelper.isValidStellarDestination(publicKey)) {
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

  fastify.post<{ Body: TOrganizationPayload; Reply: TOrganizationResult | TErrorResponse }>(
    '/etherfuse/organization',
    async (request, reply) => {
      const body = request.body

      if (
        !body?.displayName ||
        !body.accountType ||
        !body.email ||
        !body.userDisplayName ||
        !body.publicKey ||
        !StellarHelper.isValidStellarDestination(body.publicKey)
      ) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
      }

      try {
        const result = await createOrganization(body)
        return reply.status(200).send(result)
      } catch (error) {
        return reply.status(502).send({ success: false, error: mapError(error) })
      }
    }
  )

  fastify.get<{
    Params: { publicKey: string }
    Reply: TOnboardingResult | TErrorResponse
  }>('/etherfuse/customer/:publicKey', async (request, reply) => {
    const { publicKey } = request.params

    if (!StellarHelper.isValidStellarDestination(publicKey)) {
      return reply.status(400).send({ success: false, error: ErrorCode.INVALID_ADDRESS })
    }

    try {
      const cached = await findEtherfuseCustomerByPublicKey(publicKey)

      if (cached) {
        const bankAccountId =
          cached.bankAccountId ?? (await getCustomerBankAccountId(cached.customerId))

        if (bankAccountId) {
          return reply
            .status(200)
            .send({ customerId: cached.customerId, bankAccountId, presignedUrl: '' })
        }
      }

      const result = await findCustomerByPublicKey(publicKey)

      if (!result) {
        return reply.status(404).send({ success: false, error: ErrorCode.CUSTOMER_NOT_FOUND })
      }

      return reply.status(200).send(result)
    } catch (error) {
      return reply.status(502).send({ success: false, error: mapError(error) })
    }
  })

  fastify.get<{
    Params: { customerId: string; publicKey: string }
    Reply: TKycStatusResult | TErrorResponse
  }>('/etherfuse/kyc/:customerId/:publicKey', async (request, reply) => {
    const { customerId, publicKey } = request.params

    if (!StellarHelper.isValidStellarDestination(publicKey)) {
      return reply.status(400).send({ success: false, error: ErrorCode.INVALID_ADDRESS })
    }

    try {
      const result = await getKycStatus(customerId, publicKey)

      if (result.status === 'approved') {
        try {
          await upsertEtherfuseCustomer({ publicKey, customerId })
        } catch (error) {
          request.log.error({ error, publicKey, customerId }, '[Etherfuse] customer persist failed')
        }
      }

      return reply.status(200).send(result)
    } catch (error) {
      return reply.status(502).send({ success: false, error: mapError(error) })
    }
  })

  fastify.post<{
    Params: { customerId: string }
    Body: TSubmitKycPayload
    Reply: TSubmitKycResult | TErrorResponse
  }>('/etherfuse/customer/:customerId/kyc', async (request, reply) => {
    const { customerId } = request.params
    const body = request.body
    const identity = body?.identity

    if (
      !body?.publicKey ||
      !StellarHelper.isValidStellarDestination(body.publicKey) ||
      !identity?.id ||
      !identity.email ||
      !identity.phoneNumber ||
      !identity.occupation ||
      !identity.name?.givenName ||
      !identity.name?.familyName ||
      !identity.dateOfBirth ||
      !identity.address?.street ||
      !identity.address?.city ||
      !identity.address?.region ||
      !identity.address?.postalCode ||
      !identity.address?.country ||
      (identity.idNumbers !== undefined &&
        (!Array.isArray(identity.idNumbers) ||
          identity.idNumbers.length === 0 ||
          identity.idNumbers.some(idNumber => !idNumber?.value || !idNumber?.type)))
    ) {
      return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
    }

    try {
      const result = await submitKyc(customerId, body)
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
        !StellarHelper.isValidStellarDestination(body.publicKey)
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
        !StellarHelper.isValidStellarDestination(body.publicKey)
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

  // TODO: remove comment in Mainnet
  // if (!isProduction) {}
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

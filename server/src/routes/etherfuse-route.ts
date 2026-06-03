import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

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

const publicKeySchema = z.string().refine(StellarHelper.isValidStellarDestination)

const onboardingSchema = z.object({
  publicKey: publicKeySchema,
})

const organizationSchema = z.object({
  displayName: z.string().min(1),
  accountType: z.enum(['personal', 'business']),
  email: z.string().min(1),
  userDisplayName: z.string().min(1),
  publicKey: publicKeySchema,
})

const publicKeyParamsSchema = z.object({
  publicKey: publicKeySchema,
})

const kycParamsSchema = z.object({
  customerId: z.string().min(1),
  publicKey: publicKeySchema,
})

const bankAccountSchema = z.object({
  presignedUrl: z.string().min(1),
  pixKey: z.string().min(1),
  pixKeyType: z.enum(PIX_KEY_TYPES),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  cpf: z.string().min(1),
})

const quoteSchema = z.object({
  customerId: z.string().min(1),
  sourceAmount: z.string().min(1),
  token: z.enum(SUPPORTED_TOKENS as [string, ...string[]]),
  publicKey: publicKeySchema,
})

const orderSchema = z.object({
  quoteId: z.string().min(1),
  customerId: z.string().min(1),
  bankAccountId: z.string().min(1),
  publicKey: publicKeySchema,
  memo: z.string().optional(),
})

const orderIdParamsSchema = z.object({
  orderId: z.string().min(1),
})

const webhookSchema = z.object({
  event: z.enum(WEBHOOK_EVENTS as [TEtherfuseWebhookEvent, ...TEtherfuseWebhookEvent[]]),
  data: z.object({
    id: z.string().min(1),
    status: z.string(),
  }),
  timestamp: z.string().min(1),
})

const submitKycSchema = z.object({
  publicKey: z.string().refine(StellarHelper.isValidStellarDestination),
  identity: z.object({
    id: z.string().min(1),
    email: z.string().min(1),
    phoneNumber: z.string().min(1),
    occupation: z.string().min(1),
    name: z.object({
      givenName: z.string().min(1),
      familyName: z.string().min(1),
    }),
    dateOfBirth: z.string().min(1),
    address: z.object({
      street: z.string().min(1),
      city: z.string().min(1),
      region: z.string().min(1),
      postalCode: z.string().min(1),
      country: z.string().min(1),
    }),
    idNumbers: z
      .array(z.object({ value: z.string().min(1), type: z.string().min(1) }))
      .min(1)
      .optional(),
  }),
})

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
      const parsed = onboardingSchema.safeParse(request.body)

      if (!parsed.success) {
        const { statusCode, body } = sendError(400, ErrorCode.INVALID_ADDRESS)
        return reply.status(statusCode).send(body)
      }

      try {
        const result = await createOnboarding(parsed.data.publicKey)
        return reply.status(200).send(result)
      } catch (error) {
        return reply.status(502).send({ success: false, error: mapError(error) })
      }
    }
  )

  fastify.post<{ Body: TOrganizationPayload; Reply: TOrganizationResult | TErrorResponse }>(
    '/etherfuse/organization',
    async (request, reply) => {
      const parsed = organizationSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
      }

      try {
        const result = await createOrganization(parsed.data)
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
    const parsed = publicKeyParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: ErrorCode.INVALID_ADDRESS })
    }

    const { publicKey } = parsed.data

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
    const parsed = kycParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: ErrorCode.INVALID_ADDRESS })
    }

    const { customerId, publicKey } = parsed.data

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
    const parsed = submitKycSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
    }

    try {
      const result = await submitKyc(customerId, parsed.data)
      return reply.status(200).send(result)
    } catch (error) {
      return reply.status(502).send({ success: false, error: mapError(error) })
    }
  })

  fastify.post<{ Body: TBankAccountPayload; Reply: TBankAccountResult | TErrorResponse }>(
    '/etherfuse/bank-account',
    async (request, reply) => {
      const parsed = bankAccountSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
      }

      try {
        const result = await registerBankAccount(parsed.data)
        return reply.status(200).send(result)
      } catch (error) {
        return reply.status(502).send({ success: false, error: mapError(error) })
      }
    }
  )

  fastify.post<{ Body: TQuotePayload; Reply: TQuoteResult | TErrorResponse }>(
    '/etherfuse/quote',
    async (request, reply) => {
      const parsed = quoteSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
      }

      try {
        const result = await createQuote(parsed.data as TQuotePayload)
        return reply.status(200).send(result)
      } catch (error) {
        return reply.status(502).send({ success: false, error: mapError(error) })
      }
    }
  )

  fastify.post<{ Body: TOrderPayload; Reply: TOrderResult | TErrorResponse }>(
    '/etherfuse/order',
    async (request, reply) => {
      const parsed = orderSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
      }

      try {
        const result = await createOrder(parsed.data)
        return reply.status(200).send(result)
      } catch (error) {
        return reply.status(502).send({ success: false, error: mapError(error) })
      }
    }
  )

  fastify.get<{ Params: { orderId: string }; Reply: TOrderResult | TErrorResponse }>(
    '/etherfuse/order/:orderId',
    async (request, reply) => {
      const parsed = orderIdParamsSchema.safeParse(request.params)

      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
      }

      try {
        const result = await getOrder(parsed.data.orderId)
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
      const parsed = webhookSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
      }

      const body = request.body

      recordWebhookEvent(body)

      return reply.status(200).send({ success: true })
    }
  )

  // TODO: remove comment in Mainnet
  // if (!isProduction) {}
  fastify.post<{ Params: { orderId: string }; Reply: { success: boolean } | TErrorResponse }>(
    '/etherfuse/order/:orderId/simulate',
    async (request, reply) => {
      const parsed = orderIdParamsSchema.safeParse(request.params)

      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
      }

      try {
        await simulateFiatReceived(parsed.data.orderId)
        return reply.status(200).send({ success: true })
      } catch (error) {
        return reply.status(502).send({ success: false, error: mapError(error) })
      }
    }
  )
}

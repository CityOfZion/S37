import type {
  Payment,
  PaymentDestination,
  PaymentItem,
  PaymentMessage,
  PaymentStatus,
} from '@prisma/client'

import type {
  TCreatePaymentPayload,
  TGetPaymentsParams,
  TPayment,
  TPaymentDestination,
  TPaymentItem,
  TPaymentMessage,
  TPaymentMessageRole,
  TPaymentMethod,
  TPaymentPix,
  TPaymentStatus,
  TPixKeyType,
  TToken,
} from 'fractapay-shared'

import { EncryptionHelper } from '../helpers/EncryptionHelper'
import { createOrder, getOrder } from './etherfuse-service'
import { Prisma, prisma } from './prisma-service'

type TRawPayment = Payment & {
  items: PaymentItem[]
  destinations: PaymentDestination[]
  messages?: PaymentMessage[]
}

const TERMINAL_STATUSES = new Set<PaymentStatus>(['COMPLETED', 'FAILED', 'REFUNDED', 'CANCELED'])

const decryptPixData = (pixData: string | null): TPaymentPix | null => {
  if (!pixData) return null

  try {
    return JSON.parse(EncryptionHelper.decrypt(pixData)) as TPaymentPix
  } catch {
    return null
  }
}

const safeDecrypt = (value: string | null): string | null => {
  if (!value) return null

  try {
    return EncryptionHelper.decrypt(value)
  } catch {
    return null
  }
}

const mapItems = (items: PaymentItem[]): TPaymentItem[] =>
  items.map(item => ({
    id: item.id,
    amount: item.amount,
    description: item.description,
  }))

const mapDestinations = (destinations: PaymentDestination[]): TPaymentDestination[] =>
  destinations.map(destination => ({
    id: destination.id,
    destinationId: destination.destinationId,
    name: destination.name,
    token: destination.token as TToken,
    pixKey: safeDecrypt(destination.pixKey) || '',
    pixKeyType: destination.pixKeyType as TPixKeyType,
    percentage: destination.percentage,
    amount: destination.amount,
  }))

const mapMessages = (messages: PaymentMessage[]): TPaymentMessage[] =>
  messages.map(message => ({
    id: message.id,
    role: message.role as TPaymentMessageRole,
    text: message.text,
    createdAt: message.createdAt.toJSON(),
  }))

const mapPayment = (payment: TRawPayment, includeMessages = false): TPayment => ({
  id: payment.id,
  externalId: safeDecrypt(payment.externalId) || '',
  transactionSignature: payment.transactionSignature,
  status: payment.status as TPaymentStatus,
  token: payment.token as TToken,
  method: payment.method as TPaymentMethod,
  amount: payment.amount,
  feeAmount: payment.feeAmount,
  feePercentage: payment.feePercentage,
  tokenAmount: payment.tokenAmount,
  address: payment.address,
  exchangeRate: payment.exchangeRate,
  isRecurring: payment.isRecurring,
  errorMessage: payment.errorMessage,
  createdAt: payment.createdAt.toJSON(),
  updatedAt: payment.updatedAt.toJSON(),
  items: mapItems(payment.items),
  destinations: mapDestinations(payment.destinations),
  messages: includeMessages && payment.messages ? mapMessages(payment.messages) : [],
  pix: decryptPixData(payment.pixData),
})

export const createPayment = async (
  userId: string,
  data: TCreatePaymentPayload
): Promise<TPayment> => {
  const orderResponse = await createOrder({
    quoteId: data.quoteId,
    customerId: data.customerId,
    bankAccountId: data.bankAccountId,
    address: data.address,
  })

  const payment = await prisma.payment.create({
    data: {
      userId,
      status: 'CREATED',
      token: data.token,
      method: 'PIX',
      amount: data.amount,
      feeAmount: data.feeAmount,
      feePercentage: data.feePercentage,
      tokenAmount: data.tokenAmount,
      externalId: EncryptionHelper.encrypt(orderResponse.orderId),
      customerId: EncryptionHelper.encrypt(data.customerId),
      address: data.address,
      exchangeRate: data.exchangeRate,
      transactionSignature: orderResponse.confirmedTxSignature || null,
      pixData: orderResponse.pix
        ? EncryptionHelper.encrypt(JSON.stringify(orderResponse.pix))
        : null,
      isRecurring: false, // TODO: implement recurring feature
      items: {
        create: data.items.map(item => ({
          amount: item.amount,
          description: item.description || null,
        })),
      },
      destinations: {
        create: data.destinations.map(destination => ({
          destinationId: destination.id,
          name: destination.name,
          token: destination.token,
          pixKey: EncryptionHelper.encrypt(destination.pixKey),
          pixKeyType: destination.pixKeyType,
          percentage: destination.percentage,
          amount: destination.amount,
        })),
      },
      messages: {
        create: data.messages.map(message => ({
          role: message.role as TPaymentMessageRole,
          text: message.text,
        })),
      },
    },
    include: {
      items: true,
      destinations: true,
      messages: { orderBy: { createdAt: 'asc' } },
    },
  })

  return mapPayment(payment, true)
}

export const getPaymentById = async (id: string, userId: string): Promise<TPayment | null> => {
  const payment = await prisma.payment.findFirst({
    where: { id, userId },
    include: {
      items: true,
      destinations: true,
      messages: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!payment) return null

  if (!TERMINAL_STATUSES.has(payment.status) && payment.externalId) {
    try {
      const externalId = EncryptionHelper.decrypt(payment.externalId)
      const data = await getOrder(externalId)
      const newStatus = data.status.toUpperCase() as PaymentStatus

      if (newStatus !== payment.status) {
        const updateData: Prisma.PaymentUpdateInput = { status: newStatus }

        if (data.amountInTokens) updateData.tokenAmount = data.amountInTokens

        if (data.confirmedTxSignature) {
          updateData.transactionSignature = data.confirmedTxSignature
        }

        if (data.pix && !payment.pixData) {
          updateData.pixData = EncryptionHelper.encrypt(JSON.stringify(data.pix))
        }

        const updated = await prisma.payment.update({
          where: { id },
          data: updateData,
          include: {
            items: true,
            destinations: true,
            messages: { orderBy: { createdAt: 'asc' } },
          },
        })

        return mapPayment(updated, true)
      }
    } catch {
      // return stored data on Etherfuse failure
    }
  }

  return mapPayment(payment, true)
}

export const getPayments = async (
  userId: string,
  params: TGetPaymentsParams
): Promise<{
  data: TPayment[]
  total: number
  page: number
  pageSize: number
}> => {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20))
  const skip = (page - 1) * pageSize
  const where: Prisma.PaymentWhereInput = { userId }

  if (params.status) {
    where.status = params.status as PaymentStatus
  }

  if (params.dateFrom || params.dateTo) {
    const dateFilter: Prisma.DateTimeFilter = {}

    if (params.dateFrom) dateFilter.gte = new Date(params.dateFrom)
    if (params.dateTo) dateFilter.lte = new Date(params.dateTo)

    where.createdAt = dateFilter
  }

  const [total, rows] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { items: true, destinations: true },
    }),
  ])

  return {
    data: rows.map(row => mapPayment(row, false)),
    total,
    page,
    pageSize,
  }
}

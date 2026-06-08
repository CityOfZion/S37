import type { Payment, PaymentDestination, PaymentItem, PaymentMessage } from '@prisma/client'

import {
  PAYMENT_TERMINAL_STATUSES,
  TCreatePaymentPayload,
  TGetPaymentsParams,
  TGetPaymentsResponse,
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
  TUpdatePaymentByIdParams,
} from 'fractapay-shared'

import { EncryptionHelper } from '../helpers/EncryptionHelper'
import { StellarExpertsHelper } from '../helpers/StellarExpertsHelper'
import { createOrder } from './etherfuse-service'
import { Prisma, prisma } from './prisma-service'

type TRawPayment = Payment & {
  items: PaymentItem[]
  destinations: PaymentDestination[]
  messages?: PaymentMessage[]
}

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

const mapPayment = (payment: TRawPayment, includeMessages = false): TPayment => {
  const transactionHash = payment.transactionHash
  const address = payment.address

  return {
    id: payment.id,
    externalId: safeDecrypt(payment.externalId) || '',
    transactionHash,
    transactionUrl: transactionHash
      ? StellarExpertsHelper.getTransactionUrl(transactionHash)
      : null,
    status: payment.status as TPaymentStatus,
    token: payment.token as TToken,
    method: payment.method as TPaymentMethod,
    amount: payment.amount,
    feeAmount: payment.feeAmount,
    feePercentage: payment.feePercentage,
    tokenAmount: payment.tokenAmount,
    exchangeRate: payment.exchangeRate,
    isRecurrence: payment.isRecurrence,
    address,
    addressUrl: StellarExpertsHelper.getAddressUrl(address),
    errorMessage: payment.errorMessage,
    createdAt: payment.createdAt.toJSON(),
    updatedAt: payment.updatedAt.toJSON(),
    items: mapItems(payment.items),
    destinations: mapDestinations(payment.destinations),
    messages: includeMessages && payment.messages ? mapMessages(payment.messages) : [],
    pix: decryptPixData(payment.pixData),
  }
}

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
      transactionHash: orderResponse.confirmedTxSignature || null,
      pixData: orderResponse.pix
        ? EncryptionHelper.encrypt(JSON.stringify(orderResponse.pix))
        : null,
      isRecurrence: false, // TODO: implement recurrence
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

  return mapPayment(payment, true)
}

export const updatePaymentById = async ({
  id,
  status,
  tokenAmount,
  transactionHash,
}: TUpdatePaymentByIdParams): Promise<void> => {
  const newStatus = status.toUpperCase() as TPaymentStatus

  if (!PAYMENT_TERMINAL_STATUSES.has(newStatus) && newStatus !== 'CREATED') return

  const nonTerminalPayments = await prisma.payment.findMany({
    where: { status: { notIn: Array.from(PAYMENT_TERMINAL_STATUSES) } },
    select: { id: true, externalId: true },
  })

  for (const payment of nonTerminalPayments) {
    let decrypted: string

    try {
      decrypted = EncryptionHelper.decrypt(payment.externalId)
    } catch {
      continue
    }

    if (decrypted !== id) continue

    const updateData: Prisma.PaymentUpdateInput = { status: newStatus }

    if (tokenAmount) updateData.tokenAmount = tokenAmount
    if (transactionHash) updateData.transactionHash = transactionHash

    try {
      await prisma.payment.update({ where: { id: payment.id }, data: updateData })
    } catch {
      /* empty */
    }

    return
  }
}

export const getPayments = async (
  userId: string,
  params: TGetPaymentsParams
): Promise<TGetPaymentsResponse> => {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20))
  const skip = (page - 1) * pageSize
  const where: Prisma.PaymentWhereInput = { userId }

  if (params.status) {
    where.status = params.status as TPaymentStatus
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

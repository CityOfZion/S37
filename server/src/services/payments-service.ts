import type { Payment, PaymentDestination, PaymentItem, PaymentMessage } from '@prisma/client'
import BigNumber from 'bignumber.js'

import {
  PAYMENT_TERMINAL_STATUSES,
  StringHelper,
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
import {
  createOfframpOrder,
  createOnrampOrder,
  getOfframpTransactionData,
} from './etherfuse-service'
import { Prisma, prisma } from './prisma-service'

type TRawPayment = Payment & {
  items: PaymentItem[]
  destinations: PaymentDestination[]
  messages?: PaymentMessage[]
}

const safeDecrypt = (value: string | null): string | null => {
  if (!value) return null

  try {
    return EncryptionHelper.decrypt(value)
  } catch {
    return null
  }
}

const safeDecryptPixData = (pixData: string | null): TPaymentPix | null => {
  if (!pixData) return null

  try {
    return JSON.parse(safeDecrypt(pixData) || '') as TPaymentPix
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
    transactionData: destination.transactionData || null,
    transactionHash: destination.transactionHash || null,
    transactionUrl: destination.transactionHash
      ? StellarExpertsHelper.getTransactionUrl(destination.transactionHash)
      : null,
    completed: destination.completed,
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
    externalId: payment.externalId,
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
    addressUrl: StellarExpertsHelper.getContractUrl(address),
    errorMessage: payment.errorMessage,
    createdAt: payment.createdAt.toJSON(),
    updatedAt: payment.updatedAt.toJSON(),
    items: mapItems(payment.items),
    destinations: mapDestinations(payment.destinations),
    messages: includeMessages && payment.messages ? mapMessages(payment.messages) : [],
    pix: safeDecryptPixData(payment.pixData),
  }
}

export const createPayment = async (
  userId: string,
  data: TCreatePaymentPayload
): Promise<TPayment> => {
  const orderResponse = await createOnrampOrder({
    externalQuoteId: data.externalQuoteId,
    externalCustomerId: data.externalCustomerId,
    externalBankAccountId: data.externalBankAccountId,
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
      externalId: orderResponse.externalId,
      externalCustomerId: data.externalCustomerId,
      externalBankAccountId: data.externalBankAccountId,
      address: data.address,
      exchangeRate: data.exchangeRate,
      transactionHash: orderResponse.confirmedTxSignature || null,
      pixData: orderResponse.pix
        ? EncryptionHelper.encrypt(
            JSON.stringify({
              ...orderResponse.pix,
              amount: StringHelper.formatAmount(new BigNumber(data.amount).plus(data.feeAmount)),
            })
          )
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

export const payDestination = async (paymentId: string): Promise<void> => {
  const claimed = await prisma.payment.updateMany({
    where: { id: paymentId, status: 'FUNDED' },
    data: { status: 'PROCESSING' },
  })

  if (claimed.count === 0) return

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      address: true,
      token: true,
      externalCustomerId: true,
      externalBankAccountId: true,
      tokenAmount: true,
      amount: true,
      destinations: {
        select: {
          id: true,
          amount: true,
          externalId: true,
          transactionData: true,
        },
      },
    },
  })

  if (!payment) return

  const effectiveTokenAmount = payment.tokenAmount

  if (!effectiveTokenAmount || effectiveTokenAmount === '0') return

  const { externalCustomerId, externalBankAccountId } = payment

  if (!externalCustomerId || !externalBankAccountId) return

  const destinations = payment.destinations.filter(
    destination => !destination.externalId && !destination.transactionData
  )

  if (destinations.length === 0) return

  await Promise.allSettled(
    destinations.map(async destination => {
      try {
        // TODO: in production each destination should have their own externalCustomerId
        // and externalBankAccountId registered with their PIX key via Etherfuse KYC
        const destinationTokenAmount = StringHelper.formatAmount(
          new BigNumber(effectiveTokenAmount)
            .multipliedBy(destination.amount)
            .dividedBy(payment.amount)
        )

        if (!destinationTokenAmount || destinationTokenAmount === '0') return

        const response = await createOfframpOrder({
          externalCustomerId,
          externalBankAccountId,
          address: payment.address,
          tokenAmount: destinationTokenAmount,
          token: payment.token,
        })

        const { externalId } = response
        const transactionData =
          response.transactionData || (await getOfframpTransactionData(externalId))

        await prisma.paymentDestination.update({
          where: { id: destination.id },
          data: {
            externalId,
            transactionData,
          },
        })
      } catch {
        /* empty */
      }
    })
  )
}

export const updatePaymentById = async ({
  id,
  status,
  tokenAmount,
  transactionHash,
  transactionData,
}: TUpdatePaymentByIdParams): Promise<void> => {
  const providerStatus = status.toUpperCase()

  const nonTerminalPayments = await prisma.payment.findMany({
    where: { status: { notIn: Array.from(PAYMENT_TERMINAL_STATUSES) } },
    select: {
      id: true,
      externalId: true,
      tokenAmount: true,
      status: true,
      destinations: {
        select: { id: true, externalId: true, completed: true },
      },
    },
  })

  for (const payment of nonTerminalPayments) {
    let isOnramp = false

    try {
      if (payment.externalId === id) isOnramp = true
    } catch {
      /* ignore */
    }

    let matchedDestinationId: string | null = null

    if (!isOnramp) {
      for (const destination of payment.destinations) {
        if (!destination.externalId) continue

        try {
          if (destination.externalId === id) {
            matchedDestinationId = destination.id

            break
          }
        } catch {
          /* ignore */
        }
      }
    }

    if (!isOnramp && !matchedDestinationId) continue

    if (matchedDestinationId) {
      const destinationData: Prisma.PaymentDestinationUpdateInput = {}

      if (transactionData) destinationData.transactionData = transactionData
      if (transactionHash) destinationData.transactionHash = transactionHash
      if (providerStatus === 'COMPLETED') destinationData.completed = true

      if (Object.keys(destinationData).length > 0) {
        await prisma.paymentDestination.update({
          where: { id: matchedDestinationId },
          data: destinationData,
        })
      }

      if (providerStatus === 'COMPLETED') {
        const allCompleted = payment.destinations.every(
          destination => destination.id === matchedDestinationId || destination.completed
        )

        if (allCompleted) {
          try {
            await prisma.payment.update({
              where: { id: payment.id },
              data: { status: 'COMPLETED' },
            })
          } catch {
            /* empty */
          }
        }
      }

      return
    }

    if (providerStatus === 'FUNDED' || providerStatus === 'COMPLETED') {
      const updateData: Prisma.PaymentUpdateInput = {
        status: payment.status === 'PROCESSING' ? 'PROCESSING' : 'FUNDED',
      }

      if (tokenAmount) updateData.tokenAmount = tokenAmount
      if (transactionHash) updateData.transactionHash = transactionHash

      try {
        await prisma.payment.update({ where: { id: payment.id }, data: updateData })
      } catch {
        /* empty */
      }

      if (payment.status !== 'PROCESSING') {
        void payDestination(payment.id)
      }
    } else if (['FAILED', 'REFUNDED', 'CANCELED'].includes(providerStatus)) {
      try {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: providerStatus as TPaymentStatus },
        })
      } catch {
        /* empty */
      }
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

import { z } from 'zod'

import { PAYMENT_MESSAGE_ROLES, PAYMENT_STATUSES, PIX_KEY_TYPES, TOKENS } from '../constants'

export const createPaymentSchema = z.object({
  quoteId: z.string().min(1).max(500),
  customerId: z.string().min(1).max(500),
  bankAccountId: z.string().min(1).max(500),
  address: z.string().min(1).max(200),
  token: z.enum(TOKENS),
  amount: z.string().min(1).max(50),
  feeAmount: z.string().min(1).max(50),
  feePercentage: z.string().min(1).max(10),
  tokenAmount: z.string().min(1).max(50),
  exchangeRate: z.string().min(1).max(50),
  destinations: z
    .array(
      z.object({
        id: z.string().min(1).max(500),
        name: z.string().min(1).max(200),
        token: z.enum(TOKENS),
        pixKey: z.string().min(1).max(2000),
        pixKeyType: z.enum(PIX_KEY_TYPES),
        percentage: z.number().min(0.01).max(100),
        amount: z.string().min(1).max(50),
      })
    )
    .min(1),
  items: z
    .array(
      z.object({
        id: z.string().max(500).optional(),
        amount: z.string().min(1).max(50),
        description: z.string().max(400).nullable(),
      })
    )
    .min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(PAYMENT_MESSAGE_ROLES),
        text: z.string().max(5000),
      })
    )
    .min(1),
})

export const getPaymentsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(PAYMENT_STATUSES).optional(),
  dateFrom: z.string().max(50).optional(),
  dateTo: z.string().max(50).optional(),
})

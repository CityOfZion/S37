import { z } from 'zod'

import { addressSchema } from './addresses-schema'

export const loginSchema = z.object({
  address: addressSchema,
})

export const verifySchema = z.object({
  email: z.email().trim().min(1),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
})

export const requestSchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.email().trim().min(1),
})

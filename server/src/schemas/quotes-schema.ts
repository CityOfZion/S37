import { z } from 'zod'

import { SUPPORTED_TOKENS } from 'fractapay-shared'

import { addressSchema } from './addresses-schema'

export const quoteSchema = z.object({
  externalCustomerId: z.string().min(1),
  sourceAmount: z.string().min(1),
  token: z.enum(SUPPORTED_TOKENS),
  address: addressSchema,
})

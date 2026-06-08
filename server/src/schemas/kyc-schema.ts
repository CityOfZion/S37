import { z } from 'zod'

import { addressSchema } from './addresses-schema'

export const kycSchema = z.object({
  customerId: z.string().min(1),
  address: addressSchema,
})

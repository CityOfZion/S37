import { z } from 'zod'

import { addressSchema } from './addresses-schema'

export const kycSchema = z.object({
  externalCustomerId: z.string().min(1),
  address: addressSchema,
})

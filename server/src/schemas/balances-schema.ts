import { z } from 'zod'

import { addressSchema } from './addresses-schema'

export const balanceSchema = z.object({
  address: addressSchema,
})

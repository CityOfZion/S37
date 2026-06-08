import { z } from 'zod'

import { addressSchema } from './addresses-schema'

export const customersSchema = z.object({
  address: addressSchema,
})

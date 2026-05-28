import { z } from 'zod'

import { addressSchema } from './addresses-schema'

export const onboardingSchema = z.object({
  address: addressSchema,
})

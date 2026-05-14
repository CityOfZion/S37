import BigNumber from 'bignumber.js'
import { z } from 'zod'

import { StellarHelper } from 'fractapay-shared'

export const paymentEditSchema = z.object({
  address: z.string().min(1).refine(StellarHelper.isValidAddress.bind(StellarHelper)),
  amount: z.string().refine(value => {
    try {
      return new BigNumber(value).isGreaterThan(0)
    } catch {
      return false
    }
  }),
  description: z.string().max(200).default(''),
})

export type TPaymentEditFormValues = z.infer<typeof paymentEditSchema>

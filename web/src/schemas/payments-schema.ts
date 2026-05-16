import BigNumber from 'bignumber.js'
import { z } from 'zod'

export const paymentEditSchema = z.object({
  amount: z.string().refine(value => {
    try {
      return new BigNumber(value).isGreaterThan(0)
    } catch {
      return false
    }
  }),
  description: z.string().max(200),
})

export type TPaymentEditFormValues = z.infer<typeof paymentEditSchema>

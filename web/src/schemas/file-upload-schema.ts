import { z } from 'zod'

import { StellarHelper, SUPPORTED_TOKENS } from 'fractapay-shared'

export const fileUploadSchema = z.object({
  token: z.enum(SUPPORTED_TOKENS),
  address: z.string().refine(value => !!value && StellarHelper.isValidAddress(value), {
    message: 'error',
  }),
})

export type TFileUploadFormValues = z.infer<typeof fileUploadSchema>

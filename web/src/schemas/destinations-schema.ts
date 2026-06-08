import { z } from 'zod'

import { PIX_KEY, SUPPORTED_TOKENS } from 'fractapay-shared'

import { ValidationHelper } from '../helpers/ValidationHelper'

export const destinationsSchema = z
  .object({
    name: z.string().min(1, { message: 'nameError' }).max(200, { message: 'nameError' }),
    token: z.enum(SUPPORTED_TOKENS),
    pixKey: z.string().min(1, { message: 'pixKeyRequired' }),
    pixKeyType: z.enum(Object.values(PIX_KEY)),
  })
  .refine(data => ValidationHelper.validatePixKey(data.pixKey, data.pixKeyType), {
    message: 'invalidPixKey',
    path: ['pixKey'],
  })

export type TDestinationFormValues = z.infer<typeof destinationsSchema>

import { z } from 'zod'

import { ValidationHelper } from '../helpers/ValidationHelper'

export const onboardingSchema = z.object({
  fullName: z.string().min(1, { message: 'fullNameRequired' }).max(200),
  email: z
    .string()
    .min(1, { message: 'emailRequired' })
    .email({ message: 'emailInvalid' })
    .max(200),
  companyName: z.string().min(1, { message: 'companyNameRequired' }).max(200),
  cnpj: z
    .string()
    .optional()
    .refine(value => !value || ValidationHelper.validateCnpj(value), {
      message: 'invalidCnpj',
    }),
})

export type TOnboardingFormValues = z.infer<typeof onboardingSchema>

import { z } from 'zod'

export const onboardingSchema = z.object({
  fullName: z.string().min(1, { message: 'fullNameRequired' }).max(200),
  email: z
    .string()
    .min(1, { message: 'emailRequired' })
    .email({ message: 'emailInvalid' })
    .max(200),
  companyName: z.string().min(1, { message: 'companyNameRequired' }).max(200),
  cnpj: z.string().max(20).optional(),
})

export type TOnboardingFormValues = z.infer<typeof onboardingSchema>

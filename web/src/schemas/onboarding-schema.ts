import { z } from 'zod'

export const onboardingSchema = z.object({
  fullName: z.string().min(1, { message: 'fullNameRequired' }).max(200),
  email: z
    .string()
    .min(1, { message: 'emailRequired' })
    .email({ message: 'emailInvalid' })
    .max(255),
  companyName: z.string().min(1, { message: 'companyNameRequired' }).max(200),
  cnpj: z.string().max(20).optional(),
})

export type TOnboardingFormValues = z.infer<typeof onboardingSchema>

export const STEP_1_FIELDS = ['fullName', 'email'] as const
export const STEP_2_FIELDS = ['companyName', 'cnpj'] as const

export type TOnboardingStep = 1 | 2 | 3
export const TOTAL_STEPS = 3

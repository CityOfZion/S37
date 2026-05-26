import { z } from 'zod'

export const onboardingSchema = z.object({
  companyName: z.string().min(1, { message: 'companyNameRequired' }).max(200),
  cnpj: z.string().max(20).optional(),
})

export type TOnboardingFormValues = z.infer<typeof onboardingSchema>

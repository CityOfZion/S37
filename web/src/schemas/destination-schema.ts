import { z } from 'zod'

import { StellarHelper, SUPPORTED_TOKENS } from 'fractapay-shared'

const PIX_KEY_TYPES = ['evp', 'cpf', 'cnpj', 'email', 'phone'] as const

const validatePixKey = (pixKey: string, pixKeyType: string): boolean => {
  const clean = pixKey.trim()

  switch (pixKeyType) {
    case 'evp':
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)
    case 'cpf':
      return /^\d{11}$/.test(clean.replace(/\D/g, ''))
    case 'cnpj':
      return /^\d{14}$/.test(clean.replace(/\D/g, ''))
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)
    case 'phone':
      return /^\+\d{10,13}$/.test(clean)
    default:
      return false
  }
}

export const destinationSchema = z
  .object({
    name: z.string().min(1).max(200),
    token: z.enum(SUPPORTED_TOKENS),
    stellarAddress: z.string().refine(value => !!value && StellarHelper.isValidAddress(value), {
      message: 'invalidAddress',
    }),
    pixKey: z.string().min(1),
    pixKeyType: z.enum(PIX_KEY_TYPES),
  })
  .refine(data => validatePixKey(data.pixKey, data.pixKeyType), {
    message: 'invalidPixKey',
    path: ['pixKey'],
  })

export type TDestinationFormValues = z.infer<typeof destinationSchema>

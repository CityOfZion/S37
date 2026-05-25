import { z } from 'zod'

import { SUPPORTED_TOKENS } from 'fractapay-shared'

const PIX_KEY_TYPES = ['evp', 'cpf', 'cnpj', 'email', 'phone'] as const

const validateCpf = (value: string): boolean => {
  const digits = value.replace(/\D/g, '')

  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false

  const calcDigit = (base: string, factor: number): number => {
    const sum = base
      .split('')
      .reduce(
        (accumulator, character, index) => accumulator + parseInt(character) * (factor - index),
        0
      )
    const remainder = sum % 11

    return remainder < 2 ? 0 : 11 - remainder
  }

  return (
    calcDigit(digits.slice(0, 9), 10) === parseInt(digits[9]) &&
    calcDigit(digits.slice(0, 10), 11) === parseInt(digits[10])
  )
}

const validateCnpj = (value: string): boolean => {
  const digits = value.replace(/\D/g, '')

  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false

  const calcDigit = (base: string, weights: number[]): number => {
    const sum = base
      .split('')
      .reduce(
        (accumulator, character, index) => accumulator + parseInt(character) * weights[index],
        0
      )
    const remainder = sum % 11

    return remainder < 2 ? 0 : 11 - remainder
  }

  return (
    calcDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === parseInt(digits[12]) &&
    calcDigit(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === parseInt(digits[13])
  )
}

const validatePhone = (value: string): boolean => {
  const digits = value.replace(/\D/g, '')

  if (digits.length !== 12 && digits.length !== 13) return false
  if (!digits.startsWith('55')) return false

  const areaCode = parseInt(digits.slice(2, 4))

  if (areaCode < 11 || areaCode > 99) return false

  const number = digits.slice(4)

  return number.length !== 9 || number[0] === '9'
}

const validatePixKey = (pixKey: string, pixKeyType: string): boolean => {
  const clean = pixKey.trim()

  switch (pixKeyType) {
    case 'evp':
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)
    case 'cpf':
      return validateCpf(clean)
    case 'cnpj':
      return validateCnpj(clean)
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)
    case 'phone':
      return validatePhone(clean)
    default:
      return false
  }
}

export const destinationSchema = z
  .object({
    name: z.string().min(1).max(200),
    token: z.enum(SUPPORTED_TOKENS),
    pixKey: z.string().min(1, { message: 'pixKeyRequired' }),
    pixKeyType: z.enum(PIX_KEY_TYPES),
  })
  .refine(data => validatePixKey(data.pixKey, data.pixKeyType), {
    message: 'invalidPixKey',
    path: ['pixKey'],
  })

export type TDestinationFormValues = z.infer<typeof destinationSchema>

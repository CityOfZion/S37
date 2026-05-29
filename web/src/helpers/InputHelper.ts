import type { TPixKeyType } from 'fractapay-shared'

export class InputHelper {
  static applyPixKeyMask(value: string, type: TPixKeyType): string {
    const digits = value.replace(/\D/g, '')

    switch (type) {
      case 'CPF': {
        const digitsOnly = digits.slice(0, 11)

        return digitsOnly
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      }
      case 'CNPJ': {
        const digitsOnly = digits.slice(0, 14)

        return digitsOnly
          .replace(/(\d{2})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1/$2')
          .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
      }
      case 'PHONE': {
        const digitsOnly = digits.slice(0, 13)

        if (digitsOnly.length === 0) return ''
        if (digitsOnly.length <= 2) return `+${digitsOnly}`
        if (digitsOnly.length <= 4) return `+${digitsOnly.slice(0, 2)} (${digitsOnly.slice(2)}`
        if (digitsOnly.length <= 9)
          return `+${digitsOnly.slice(0, 2)} (${digitsOnly.slice(2, 4)}) ${digitsOnly.slice(4)}`

        return `+${digitsOnly.slice(0, 2)} (${digitsOnly.slice(2, 4)}) ${digitsOnly.slice(4, 9)}-${digitsOnly.slice(9)}`
      }
      case 'EVP':
      case 'EMAIL':
      default:
        return value
    }
  }

  static normalizePixKeyForStorage(value: string, type: TPixKeyType): string {
    switch (type) {
      case 'CPF':
      case 'CNPJ':
      case 'PHONE':
        return value.replace(/\D/g, '')
      default:
        return value
    }
  }

  static maskPixKeyDisplay(value: string, type: TPixKeyType): string {
    if (!value) return ''

    switch (type) {
      case 'CPF': {
        const digitsOnly = value.replace(/\D/g, '')

        if (digitsOnly.length < 11) return value

        return `**${digitsOnly.slice(2, 3)}.${digitsOnly.slice(3, 6)}.${digitsOnly.slice(6, 9)}-**`
      }
      case 'CNPJ': {
        const digitsOnly = value.replace(/\D/g, '')

        if (digitsOnly.length < 14) return value

        return `**.${digitsOnly.slice(2, 5)}.${digitsOnly.slice(5, 8)}/${digitsOnly.slice(8, 12)}-**`
      }
      case 'PHONE': {
        const digitsOnly = value.replace(/\D/g, '')

        if (digitsOnly.length < 10) return value

        const country = digitsOnly.slice(0, 2)
        const area = digitsOnly.slice(2, 4)
        const suffix = digitsOnly.slice(-4)

        return `+${country} (${area}) *****-${suffix}`
      }
      case 'EMAIL': {
        const [local, domain] = value.split('@')

        if (!domain) return value

        return `${local.slice(0, 2)}****@${domain}`
      }
      case 'EVP': {
        const parts = value.split('-')

        if (parts.length !== 5) return value

        return `${parts[0]}-****-****-****-${parts[4]}`
      }
      default:
        return value
    }
  }
}

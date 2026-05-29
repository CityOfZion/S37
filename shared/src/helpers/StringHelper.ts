import BigNumber from 'bignumber.js'

import { FIAT_BY_TOKEN, LANGUAGE_BY_TOKEN, STELLAR_DECIMALS, SYMBOL_BY_TOKEN } from '../constants'
import type { TToken } from '../types'

export class StringHelper {
  static truncateMiddle(value: string, maxLength: number): string {
    if (value.length <= maxLength) return value

    const end = Math.round(maxLength / 2)
    const start = maxLength - end

    return `${value.slice(0, start)}…${value.slice(-end)}`
  }

  static formatAmount(value: string | number | BigNumber): string {
    const emptyValue = '0'
    let stringValue = emptyValue

    try {
      if (BigNumber.isBigNumber(value)) {
        stringValue = value.isNaN() ? emptyValue : value.toFixed()
      } else if (typeof value === 'number') {
        stringValue = !value || isNaN(value) ? emptyValue : value.toString() || emptyValue
      } else if (typeof value === 'string') {
        stringValue = value || emptyValue
      }

      const bigNumber = new BigNumber(stringValue)

      if (bigNumber.isNaN()) return emptyValue

      return bigNumber.decimalPlaces(STELLAR_DECIMALS, BigNumber.ROUND_DOWN).toFixed()
    } catch {
      return stringValue
    }
  }

  static formatCurrencyAmount(value: string, token: TToken): string {
    const emptyValue = 0
    let safeValue = emptyValue

    try {
      const bigNumber = new BigNumber(value || emptyValue)

      safeValue = bigNumber.isNaN() ? emptyValue : bigNumber.toNumber()
    } catch {
      /* empty */
    }

    return new Intl.NumberFormat(LANGUAGE_BY_TOKEN[token], {
      style: 'currency',
      currency: FIAT_BY_TOKEN[token],
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .formatToParts(safeValue)
      .map(part => (part.type === 'currency' ? `${SYMBOL_BY_TOKEN[token]} ` : part.value))
      .join('')
      .trim()
  }

  static maskCnpj(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 14)

    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
    if (digits.length <= 12)
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`

    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
  }
}

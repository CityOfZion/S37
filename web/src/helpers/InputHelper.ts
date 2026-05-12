import { ChangeEvent } from 'react'

import { StrKey } from '@stellar/stellar-sdk'

export class InputHelper {
  static isValidAddress(value: string): boolean {
    return StrKey.isValidEd25519PublicKey(value)
  }

  static sanitizeAddress(value: string): string {
    return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  }

  static sanitizeAddressEvent(event: ChangeEvent<HTMLInputElement>): string {
    const input = event.target
    const { value } = input

    const newPosition = value
      .slice(0, input.selectionStart || 0)
      .replace(/[^a-zA-Z0-9]/g, '').length

    const sanitized = this.sanitizeAddress(value)

    requestAnimationFrame(() => {
      input.setSelectionRange(newPosition, newPosition)
    })

    return sanitized
  }
}

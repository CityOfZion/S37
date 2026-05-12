import { ChangeEvent } from 'react'

export class InputHelper {
  static sanitizeAddressEvent(event: ChangeEvent<HTMLInputElement>): string {
    const input = event.target
    const { value } = input

    const newPosition = value
      .slice(0, input.selectionStart || 0)
      .replace(/[^a-zA-Z0-9]/g, '').length

    const sanitized = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

    requestAnimationFrame(() => {
      input.setSelectionRange(newPosition, newPosition)
    })

    return sanitized
  }
}

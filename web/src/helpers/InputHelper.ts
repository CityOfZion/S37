import { ChangeEvent } from 'react'

type TSanitizeAmountEventChar = { char: string; position: number }

export class InputHelper {
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

  static sanitizeAmountEvent(event: ChangeEvent<HTMLInputElement>): string {
    const input = event.target
    const { value } = input
    const cursorPosition = input.selectionStart || 0
    const normalized = value.replace(/,/g, '.')
    const validChars: TSanitizeAmountEventChar[] = []

    for (let index = 0; index < normalized.length; index++) {
      if (/[0-9.]/.test(normalized[index])) {
        validChars.push({ char: normalized[index], position: index })
      }
    }

    const dotChars = validChars.filter(({ char }) => char === '.')
    let filteredChars = validChars

    if (dotChars.length > 1) {
      const keepDotPosition = dotChars.reduce((best, { position }) => {
        const distance = Math.abs(position - (cursorPosition - 1))
        const bestDistance = Math.abs(best - (cursorPosition - 1))

        return distance < bestDistance ? position : best
      }, dotChars[0].position)

      filteredChars = validChars.filter(
        ({ char, position }) => char !== '.' || position === keepDotPosition
      )
    }

    const newCursorPosition = filteredChars.filter(
      ({ position }) => position < cursorPosition
    ).length

    requestAnimationFrame(() => {
      input.setSelectionRange(newCursorPosition, newCursorPosition)
    })

    return filteredChars.map(({ char }) => char).join('')
  }
}

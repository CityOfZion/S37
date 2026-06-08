type TCopyOptions = {
  onSuccess?: () => void
  onAfterSuccess?: () => void
  afterSuccessMilliseconds?: number
  onError?: () => void
}

export class ClipboardHelper {
  static async paste(): Promise<string | undefined> {
    try {
      return await navigator.clipboard.readText()
    } catch {
      return undefined
    }
  }

  static async copy(value: string, options?: TCopyOptions): Promise<void> {
    const { onSuccess, onAfterSuccess, afterSuccessMilliseconds, onError } = options || {}

    try {
      await navigator.clipboard.writeText(value)

      onSuccess?.()

      if (onAfterSuccess) {
        setTimeout(() => onAfterSuccess(), afterSuccessMilliseconds ?? 2000)
      }
    } catch {
      onError?.()
    }
  }
}

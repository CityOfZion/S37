type TCopyOptions = {
  onSuccess?: () => void
  onAfterSuccess?: () => void
  afterSuccessMilliseconds?: number
}

export class ClipboardHelper {
  static async copy(value: string, options?: TCopyOptions): Promise<void> {
    const { onSuccess, onAfterSuccess, afterSuccessMilliseconds } = options || {}

    try {
      await navigator.clipboard.writeText(value)
  
      onSuccess?.()
  
      if (onAfterSuccess) {
        setTimeout(() => onAfterSuccess(), afterSuccessMilliseconds ?? 2000)
      }
    } catch (error) {
      console.error(error)
    }
  }
}

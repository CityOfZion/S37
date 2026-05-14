import { useCallback, useRef, useState } from 'react'

export function useDebounce(delay = 2000) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isDebouncePending, setIsDebouncePending] = useState(false)

  const debounce = useCallback(
    (fn: () => void | Promise<void>) => {
      setIsDebouncePending(true)

      if (timeoutRef.current) clearTimeout(timeoutRef.current)

      timeoutRef.current = setTimeout(async () => {
        try {
          await fn()
        } finally {
          setIsDebouncePending(false)
        }
      }, delay)
    },
    [delay]
  )

  return { isDebouncePending, debounce }
}

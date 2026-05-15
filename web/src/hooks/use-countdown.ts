import { useEffect, useState } from 'react'

export function useCountdown(deadlineIso: string | null) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!deadlineIso) return

    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 1000)

    return () => clearInterval(interval)
  }, [deadlineIso])

  if (!deadlineIso) {
    return { remainingSeconds: 0, isExpired: true }
  }

  const deadline = new Date(deadlineIso).getTime()
  const remainingSeconds = Math.max(0, Math.floor((deadline - now) / 1000))

  return { remainingSeconds, isExpired: remainingSeconds <= 0 }
}

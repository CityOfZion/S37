import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from './Button'

import RefreshIcon from '../assets/icons/refresh-icon.svg?react'

type TProps = {
  expiresAt: string | null
  remainingSeconds: number
  totalSeconds: number
  isExpired: boolean
  isRefreshing: boolean
  onRefresh: () => void
}

const SIZE = 24
const STROKE = 3
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const LOADING_VISIBLE_FRACTION = 0.25

export const CountdownRing = ({
  expiresAt,
  remainingSeconds,
  totalSeconds,
  isExpired,
  isRefreshing,
  onRefresh,
}: TProps) => {
  const { t } = useTranslation('components', { keyPrefix: 'reviewModal' })
  const circleRef = useRef<SVGCircleElement | null>(null)

  const showExpired = !isRefreshing && isExpired
  const loadingDashOffset = CIRCUMFERENCE * (1 - LOADING_VISIBLE_FRACTION)

  useEffect(() => {
    const circle = circleRef.current

    if (!circle || isRefreshing) return
    if (!expiresAt) {
      circle.style.transition = 'none'
      circle.style.strokeDashoffset = String(CIRCUMFERENCE)

      return
    }
    if (isExpired) {
      circle.style.transition = 'none'
      circle.style.strokeDashoffset = '0'

      return
    }

    const totalMs = totalSeconds * 1000
    const deadline = new Date(expiresAt).getTime()
    const now = Date.now()
    const remainingMs = Math.max(0, deadline - now)
    const elapsedMs = Math.max(0, totalMs - remainingMs)
    const startOffset = CIRCUMFERENCE * (1 - Math.min(1, elapsedMs / totalMs))

    circle.style.transition = 'none'
    circle.style.strokeDashoffset = String(startOffset)

    const frame = requestAnimationFrame(() => {
      circle.style.transition = `stroke-dashoffset ${remainingMs}ms linear`
      circle.style.strokeDashoffset = '0'
    })

    return () => cancelAnimationFrame(frame)
  }, [expiresAt, isExpired, isRefreshing, totalSeconds])

  const label = isRefreshing
    ? t('loading')
    : showExpired
      ? t('expired')
      : t('expiresIn', { seconds: remainingSeconds })

  return (
    <div className="flex items-center gap-3">
      <span aria-live="polite" className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
        {label}
      </span>

      <div className="relative" aria-hidden="true">
        <svg width={SIZE} height={SIZE} className={isRefreshing ? 'animate-spin' : ''}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={STROKE}
            fill="none"
          />
          <circle
            ref={circleRef}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="currentColor"
            className={showExpired ? 'text-red-400' : 'text-primary'}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={isRefreshing ? loadingDashOffset : CIRCUMFERENCE}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </svg>
      </div>

      <Button
        aria-label={t('refresh')}
        variant="outline"
        size="xs"
        disabled={isRefreshing}
        onClick={onRefresh}
      >
        <RefreshIcon className="size-4" aria-hidden="true" />
        {t('refresh')}
      </Button>
    </div>
  )
}

import { JSX, type SVGProps, type TouchEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useNavigate } from '@tanstack/react-router'

import { Button } from '../components/Button'
import { Skeleton } from '../components/Skeleton'
import { StyleHelper } from '../helpers/StyleHelper'
import { useBreadcrumb } from '../hooks/use-breadcrumb-store'
import { useLanguageStore } from '../hooks/use-language-store'
import { usePageTitle } from '../hooks/use-page-title'

import CalendarMonthIcon from '../assets/icons/calendar-month-icon.svg?react'
import CalendarWeekIcon from '../assets/icons/calendar-week-icon.svg?react'
import ChevronLeftIcon from '../assets/icons/chevron-left-icon.svg?react'
import ChevronRightIcon from '../assets/icons/chevron-right-icon.svg?react'
import ContractIcon from '../assets/icons/contract-icon.svg?react'
import ReviewIcon from '../assets/icons/review-icon.svg?react'

type TStatCardProps = {
  title: string
  value: string
  label: string
  icon: (props: SVGProps<SVGSVGElement>) => JSX.Element
  iconContainerClassName: string
  isLoading?: boolean
}

const StatCard = ({
  title,
  value,
  label,
  icon: Icon,
  iconContainerClassName,
  isLoading,
}: TStatCardProps) => (
  <article className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
    <div className="flex items-start justify-between gap-2">
      <p className="text-xs sm:text-sm font-medium text-neutral-500 leading-snug">{title}</p>
      <div
        className={StyleHelper.merge(
          'size-8 sm:size-9 rounded-xl flex items-center justify-center shrink-0',
          iconContainerClassName
        )}
      >
        <Icon className="size-4 sm:size-5" aria-hidden="true" />
      </div>
    </div>

    {isLoading ? (
      <div className="space-y-2">
        <Skeleton className="h-7 w-24 sm:h-8 sm:w-28" />
        <Skeleton className="h-3 w-14 sm:w-16" />
      </div>
    ) : (
      <div>
        <p className="text-2xl font-extrabold text-neutral-900 leading-none">{value}</p>
        <p className="text-xs text-neutral-400 mt-1.5">{label}</p>
      </div>
    )}
  </article>
)

type TContractColor = {
  dot: string
  badge: string
  text: string
}

type TContract = {
  id: string
  name: string
  color: TContractColor
}

type TPaymentEvent = {
  contractId: string
  day: number
}

const CONTRACT_COLORS: TContractColor[] = [
  { dot: 'bg-blue-500', badge: 'bg-blue-50', text: 'text-blue-700' },
  { dot: 'bg-emerald-500', badge: 'bg-emerald-50', text: 'text-emerald-700' },
  { dot: 'bg-amber-500', badge: 'bg-amber-50', text: 'text-amber-700' },
  { dot: 'bg-violet-500', badge: 'bg-violet-50', text: 'text-violet-700' },
  { dot: 'bg-rose-500', badge: 'bg-rose-50', text: 'text-rose-700' },
]

const MOCK_CONTRACTS: TContract[] = [
  { id: '1', name: 'Royalties – Label A', color: CONTRACT_COLORS[0] },
  { id: '2', name: 'Payroll – Team', color: CONTRACT_COLORS[1] },
  { id: '3', name: 'Commissions – Sales', color: CONTRACT_COLORS[2] },
  { id: '4', name: 'Retainer – Partners', color: CONTRACT_COLORS[3] },
  { id: '5', name: 'Licensing – Tech', color: CONTRACT_COLORS[4] },
]

const TODAY = new Date()

const MOCK_EVENTS: TPaymentEvent[] = [
  { contractId: '1', day: 3 },
  { contractId: '2', day: 5 },
  { contractId: '1', day: 10 },
  { contractId: '3', day: 10 },
  { contractId: '4', day: 15 },
  { contractId: '2', day: 15 },
  { contractId: '5', day: 15 },
  { contractId: '5', day: 18 },
  { contractId: '1', day: 20 },
  { contractId: '3', day: 22 },
  { contractId: '4', day: 25 },
  { contractId: '2', day: 28 },
  { contractId: '1', day: TODAY.getDate() },
  { contractId: '3', day: TODAY.getDate() },
]

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()

// Monday-first offset: Mon=0 … Sun=6
const getFirstWeekdayOffset = (year: number, month: number) => {
  const day = new Date(year, month, 1).getDay()

  return (day + 6) % 7
}

const buildCalendarGrid = (year: number, month: number): (number | null)[] => {
  const daysInMonth = getDaysInMonth(year, month)
  const offset = getFirstWeekdayOffset(year, month)
  const grid: (number | null)[] = Array(offset).fill(null)

  for (let day = 1; day <= daysInMonth; day++) {
    grid.push(day)
  }

  while (grid.length % 7 !== 0) {
    grid.push(null)
  }

  return grid
}

// Jan 1 2024 was a Monday — use as anchor for weekday labels
const WEEK_ANCHOR_YEAR = 2024
const WEEK_ANCHOR_MONTH = 0

type TPaymentCalendarProps = {
  previousMonthAriaLabel: string
  nextMonthAriaLabel: string
}

const PaymentCalendar = ({ previousMonthAriaLabel, nextMonthAriaLabel }: TPaymentCalendarProps) => {
  const { language } = useLanguageStore()
  const [viewYear, setViewYear] = useState(TODAY.getFullYear())
  const [viewMonth, setViewMonth] = useState(TODAY.getMonth())

  const isCurrentMonth = viewYear === TODAY.getFullYear() && viewMonth === TODAY.getMonth()

  const grid = buildCalendarGrid(viewYear, viewMonth)

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(language, {
    month: 'long',
    year: 'numeric',
  })

  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    new Date(WEEK_ANCHOR_YEAR, WEEK_ANCHOR_MONTH, index + 1).toLocaleDateString(language, {
      weekday: 'short',
    })
  )

  const eventsForDay = (day: number) =>
    MOCK_EVENTS.filter(event => event.day === day)
      .map(event => MOCK_CONTRACTS.find(contract => contract.id === event.contractId))
      .filter((contract): contract is TContract => contract !== undefined)

  const goToPreviousMonth = () => {
    if (viewMonth === 0) {
      setViewYear(year => year - 1)
      setViewMonth(11)
    } else {
      setViewMonth(month => month - 1)
    }
  }

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(year => year + 1)
      setViewMonth(0)
    } else {
      setViewMonth(month => month + 1)
    }
  }

  const totalRows = grid.length / 7

  const touchStartX = useRef<number | null>(null)
  const SWIPE_THRESHOLD = 50

  const handleTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0].clientX
  }

  const handleTouchEnd = (event: TouchEvent) => {
    if (touchStartX.current === null) return

    const delta = touchStartX.current - event.changedTouches[0].clientX

    if (Math.abs(delta) < SWIPE_THRESHOLD) return

    if (delta > 0) {
      goToNextMonth()
    } else {
      goToPreviousMonth()
    }

    touchStartX.current = null
  }

  return (
    <div
      className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 border-b border-neutral-100">
        <h3 className="font-semibold text-neutral-900 capitalize">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            onClick={goToPreviousMonth}
            aria-label={previousMonthAriaLabel}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
          >
            <ChevronLeftIcon className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            onClick={goToNextMonth}
            aria-label={nextMonthAriaLabel}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
          >
            <ChevronRightIcon className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-neutral-100">
        {weekdayLabels.map(label => (
          <div
            key={label}
            className="text-center text-[9px] sm:text-[10px] font-bold tracking-wide text-neutral-400 uppercase py-2"
            aria-hidden="true"
          >
            {label.slice(0, 1)}
            <span className="hidden sm:inline">{label.slice(1, 2)}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 border-l border-t border-neutral-100">
        {grid.map((day, index) => {
          const isToday = isCurrentMonth && day === TODAY.getDate()
          const row = Math.floor(index / 7)
          const column = index % 7
          const isLastRow = row === totalRows - 1
          const isLastColumn = column === 6
          const contracts = day ? eventsForDay(day) : []

          return (
            <div
              key={index}
              className={StyleHelper.merge(
                'min-h-10 sm:min-h-16 p-1 sm:p-2 border-r border-b border-neutral-100',
                isLastRow && 'border-b-0',
                isLastColumn && 'border-r-0',
                !day && 'bg-neutral-50/60'
              )}
            >
              {day && (
                <>
                  <span
                    className={StyleHelper.merge(
                      'inline-flex items-center justify-center size-5 sm:size-6 text-[10px] sm:text-xs font-medium rounded-full',
                      isToday
                        ? 'bg-primary text-white font-bold'
                        : 'text-neutral-500 hover:bg-neutral-100'
                    )}
                  >
                    {day}
                  </span>

                  {contracts.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {contracts.slice(0, 3).map((contract, contractIndex) => (
                        <span
                          key={contractIndex}
                          className={StyleHelper.merge(
                            'size-1.5 sm:size-2 rounded-full shrink-0',
                            contract.color.dot
                          )}
                          title={contract.name}
                          aria-label={contract.name}
                        />
                      ))}
                      {contracts.length > 3 && (
                        <span className="text-[8px] text-neutral-400 leading-none self-center">
                          +{contracts.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      <div className="px-3 sm:px-5 py-3 sm:py-4 border-t border-neutral-100 flex flex-wrap gap-1.5 sm:gap-2">
        {MOCK_CONTRACTS.map(contract => (
          <span
            key={contract.id}
            className={StyleHelper.merge(
              'inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium',
              contract.color.badge,
              contract.color.text
            )}
          >
            <span
              className={StyleHelper.merge('size-1.5 rounded-full shrink-0', contract.color.dot)}
              aria-hidden="true"
            />
            {contract.name}
          </span>
        ))}
      </div>
    </div>
  )
}

export const DashboardPage = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'dashboard' })
  const navigate = useNavigate()

  const isLoading = false

  const STAT_CARDS = [
    {
      key: 'nextSevenDays',
      title: t('nextSevenDays'),
      value: 'R$ 12.450,00',
      label: t('paymentsLabel', { count: 8 }),
      icon: CalendarWeekIcon,
      iconContainerClassName: 'bg-primary/10 text-primary',
    },
    {
      key: 'thisMonth',
      title: t('thisMonth'),
      value: 'R$ 48.320,00',
      label: t('paymentsLabel', { count: 31 }),
      icon: CalendarMonthIcon,
      iconContainerClassName: 'bg-violet-50 text-violet-600',
    },
    {
      key: 'activeContracts',
      title: t('activeContracts'),
      value: '5',
      label: t('contractsLabel', { count: 5 }),
      icon: ContractIcon,
      iconContainerClassName: 'bg-emerald-50 text-emerald-600',
    },
    {
      key: 'pendingReview',
      title: t('pendingReview'),
      value: '3',
      label: t('pendingLabel', { count: 3 }),
      icon: ReviewIcon,
      iconContainerClassName: 'bg-amber-50 text-amber-600',
    },
  ]

  usePageTitle(t('title'))
  useBreadcrumb([{ label: t('title') }])

  return (
    <main className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">{t('title')}</h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5 sm:mt-1">{t('subtitle')}</p>
        </div>
        <Button
          variant="primary"
          onClick={() => void navigate({ to: '/chat' })}
          className="w-full sm:w-auto"
        >
          {t('addPayment')}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {STAT_CARDS.map(card => (
          <StatCard
            key={card.key}
            title={card.title}
            value={card.value}
            label={card.label}
            icon={card.icon}
            iconContainerClassName={card.iconContainerClassName}
            isLoading={isLoading}
          />
        ))}
      </div>

      <section aria-labelledby="schedule-heading">
        <h2
          id="schedule-heading"
          className="text-base sm:text-lg font-semibold text-neutral-900 mb-3 sm:mb-4"
        >
          {t('schedule')}
        </h2>
        <PaymentCalendar
          previousMonthAriaLabel={t('previousMonth')}
          nextMonthAriaLabel={t('nextMonth')}
        />
      </section>
    </main>
  )
}

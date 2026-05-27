import { useTranslation } from 'react-i18next'

import BigNumber from 'bignumber.js'

import type { TDestinationAllocation, TPayment, TToken } from 'fractapay-shared'
import { StringHelper } from 'fractapay-shared'

import { Button } from './Button'
import { Tooltip } from './Tooltip'

type TProps = {
  payments: TPayment[]
  allocations: TDestinationAllocation[]
  token: TToken
  onOpenPayments: () => void
  onOpenAllocations: () => void
  orderExecuted: boolean
}

export const ChatPaymentsBar = ({
  payments,
  allocations,
  token,
  onOpenPayments,
  onOpenAllocations,
  orderExecuted,
}: TProps) => {
  const { t } = useTranslation('pages', { keyPrefix: 'chat' })

  const total = payments.reduce(
    (sum, payment) => sum.plus(new BigNumber(payment.amount || '0')),
    new BigNumber(0)
  )

  if (payments.length === 0 && !orderExecuted) return null

  const formattedTotal = StringHelper.formatCurrencyAmount(StringHelper.formatAmount(total), token)

  return (
    <div className="max-w-3xl mx-auto w-full px-4 flex flex-col gap-y-2">
      {payments.length > 0 && (
        <div className="rounded-xl bg-white border border-neutral-200 shadow-sm px-4 py-2 flex flex-col sm:flex-row max-sm:items-start sm:justify-between gap-x-2 gap-y-1">
          <Tooltip content={t('paymentsPanel', { count: payments.length })}>
            <Button
              variant="ghost"
              size="xs"
              className="flex items-center gap-2 text-xs px-0 h-auto min-h-0 text-neutral-800 hover:text-primary hover:bg-transparent active:bg-transparent active:opacity-70 rounded"
              onClick={onOpenPayments}
            >
              <span className="font-semibold">
                {t('paymentsCount', { count: payments.length })}
              </span>
              <span className="h-3.5 w-px bg-neutral-200 shrink-0" aria-hidden="true" />
              <span className="text-neutral-500">{formattedTotal}</span>
            </Button>
          </Tooltip>

          {allocations.length > 0 && (
            <Tooltip content={t('allocationsPanel', { count: allocations.length })}>
              <Button
                variant="ghost"
                size="xs"
                className="text-xs font-semibold text-primary px-0 h-auto min-h-0 hover:text-primary/70 hover:bg-transparent active:bg-transparent active:opacity-70 rounded"
                onClick={onOpenAllocations}
              >
                {t('allocationsCount', { count: allocations.length })}
              </Button>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  )
}

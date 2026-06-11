import { useTranslation } from 'react-i18next'

import type { TPaymentStatus } from 'fractapay-shared'

import { StyleHelper } from '../helpers/StyleHelper'

type TProps = {
  status: TPaymentStatus
  className?: string
}

const PAYMENT_STATUS_CLASSES: Record<TPaymentStatus, string> = {
  CREATED: 'bg-blue-100 text-blue-700',
  FUNDED: 'bg-yellow-100 text-yellow-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-orange-100 text-orange-700',
  CANCELED: 'bg-neutral-100 text-neutral-600',
}

export const PaymentStatusBadge = ({ status, className }: TProps) => {
  const { t } = useTranslation('pages', { keyPrefix: 'payment' })

  return (
    <span
      className={StyleHelper.merge(
        'inline-flex items-center rounded-full font-semibold px-2 py-0.5 text-xs',
        PAYMENT_STATUS_CLASSES[status],
        className
      )}
    >
      {t(`statuses.${status}`)}
    </span>
  )
}

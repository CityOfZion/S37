import { useTranslation } from 'react-i18next'

import { useNavigate, useParams } from '@tanstack/react-router'
import { match } from 'ts-pattern'

import { Button } from '../components/Button'
import { useOrderQuery } from '../hooks/use-order-query'

export const PaymentPage = () => {
  const { t } = useTranslation('components', { keyPrefix: 'payment' })
  const navigate = useNavigate()
  const { orderId } = useParams({ from: '/authLayout/payment/$orderId' })
  const { data, isLoading, isError } = useOrderQuery(orderId)

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-neutral-900 font-bold text-2xl">{t('title')}</h2>
        <Button variant="outline" onClick={() => void navigate({ to: '/' })}>
          {t('back')}
        </Button>
      </div>

      {match({ isLoading, isError, data })
        .with({ isLoading: true }, () => <p className="text-neutral-500">{t('loading')}</p>)
        .with({ isError: true }, () => <p className="text-danger-500">{t('error')}</p>)
        .when(
          ({ data: orderData }) => !!orderData,
          ({ data: orderData }) =>
            orderData && (
              <div className="space-y-4">
                <div className="rounded-xl border border-neutral-200 bg-white px-4 py-4 text-sm text-neutral-700 shadow-sm">
                  {t('status')}: <strong>{t(`statuses.${orderData.status}`)}</strong>
                </div>
              </div>
            )
        )
        .otherwise(() => null)}
    </main>
  )
}

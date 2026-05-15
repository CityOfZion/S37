import { useTranslation } from 'react-i18next'

import { useNavigate, useParams } from '@tanstack/react-router'
import { match } from 'ts-pattern'

import { Button } from '../components/Button'
import { useOrderQuery } from '../hooks/use-order-query'

export const PaymentPage = () => {
  const { t } = useTranslation('components', { keyPrefix: 'payment' })
  const navigate = useNavigate()
  const { orderId } = useParams({ from: '/payment/$orderId' })
  const { data, isLoading, isError } = useOrderQuery(orderId)

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-white font-semibold text-2xl">{t('title')}</h2>
        <Button variant="outline" onClick={() => void navigate({ to: '/' })}>
          {t('back')}
        </Button>
      </div>

      {match({ isLoading, isError, data })
        .with({ isLoading: true }, () => <p className="text-gray-400">{t('loading')}</p>)
        .with({ isError: true }, () => <p className="text-red-400">{t('error')}</p>)
        .when(
          ({ data: orderData }) => !!orderData,
          ({ data: orderData }) =>
            orderData && (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                  {t('status')}: <strong>{t(`statuses.${orderData.status}`)}</strong>
                </div>
              </div>
            )
        )
        .otherwise(() => null)}
    </main>
  )
}

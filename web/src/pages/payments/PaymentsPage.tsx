import { useTranslation } from 'react-i18next'

import { useNavigate } from '@tanstack/react-router'

import { StringHelper, TOKEN } from 'fractapay-shared'

import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { Skeleton } from '../../components/Skeleton'
import { Tooltip } from '../../components/Tooltip'
import { PAYMENT_STATUS_CLASSES } from '../../constants'
import { StyleHelper } from '../../helpers/StyleHelper'
import { useBreadcrumb } from '../../hooks/use-breadcrumb-store'
import { useLanguageStore } from '../../hooks/use-language-store'
import { usePageTitle } from '../../hooks/use-page-title'
import { usePaymentsQuery } from '../../hooks/use-payments-query'

import EmptyStateIcon from '../../assets/icons/empty-state-icon.svg?react'
import RefreshIcon from '../../assets/icons/refresh-icon.svg?react'

export const PaymentsPage = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'payments' })
  const { t: tPayment } = useTranslation('pages', { keyPrefix: 'payment' })
  usePageTitle(t('title'))
  useBreadcrumb([{ label: t('title') }])
  const { language } = useLanguageStore()
  const navigate = useNavigate()
  const { data: paymentsData, isLoading } = usePaymentsQuery()

  const payments = paymentsData?.data || []

  const handleNavigate = (paymentId: string) => {
    void navigate({ to: '/payments/$id', params: { id: paymentId } })
  }

  const handleRecurrence = () => {
    // TODO: implement recurrence
  }

  if (isLoading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="px-4 py-4 border-b border-neutral-100 last:border-0">
              <Skeleton className="h-5 w-full" />
            </div>
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-sm text-neutral-500 mt-1">{t('subtitle')}</p>
      </div>

      {payments.length === 0 ? (
        <EmptyState icon={EmptyStateIcon} title={t('empty')} description={t('subtitle')} />
      ) : (
        <>
          <ul className="sm:hidden space-y-3">
            {payments.map(payment => {
              const total = StringHelper.formatCurrencyAmount(payment.amount, TOKEN.TESOURO)
              const statusKey = payment.status
              const statusClass =
                PAYMENT_STATUS_CLASSES[statusKey] || PAYMENT_STATUS_CLASSES.CREATED

              return (
                <li
                  key={payment.id}
                  className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden"
                >
                  <Button
                    variant="ghost"
                    className="flex w-full text-left p-4 flex-col items-start justify-start gap-0 rounded-none hover:bg-neutral-50 hover:text-neutral-700 active:bg-neutral-50"
                    onClick={() => handleNavigate(payment.id)}
                  >
                    <div className="flex w-full items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-neutral-900">
                          {new Date(payment.createdAt).toLocaleDateString(language, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {new Date(payment.createdAt).toLocaleTimeString(language, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-bold text-neutral-900 whitespace-nowrap">{total}</p>
                        <span
                          className={StyleHelper.merge(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mt-1',
                            statusClass
                          )}
                        >
                          {tPayment(`statuses.${statusKey}`)}
                        </span>
                      </div>
                    </div>
                  </Button>
                  <div className="border-t border-neutral-100 px-4 py-3 flex items-center justify-between bg-neutral-50/50">
                    <p className="text-xs text-neutral-500">
                      {t('mobileSummary', {
                        payments: payment.items.length,
                        recipients: payment.destinations.length,
                      })}
                    </p>
                    <Tooltip content={t('recurrence')}>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-warning-500 hover:text-warning-500 hover:bg-transparent active:bg-transparent focus:bg-transparent"
                        aria-label={t('recurrence')}
                        disabled={payment.status !== 'COMPLETED'}
                        onClick={handleRecurrence}
                      >
                        <RefreshIcon className="size-4" aria-hidden="true" />
                      </Button>
                    </Tooltip>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="hidden sm:block rounded-2xl border border-neutral-200 bg-white overflow-x-auto shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {t('columns.date')}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {t('columns.paymentsCount')}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {t('columns.recipientsCount')}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {t('columns.amount')}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {t('columns.status')}
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {payments.map(payment => {
                  const total = StringHelper.formatCurrencyAmount(payment.amount, TOKEN.TESOURO)
                  const statusKey = payment.status
                  const statusClass =
                    PAYMENT_STATUS_CLASSES[statusKey] || PAYMENT_STATUS_CLASSES.CREATED

                  return (
                    <tr
                      key={payment.id}
                      className="hover:bg-neutral-50 transition-colors cursor-pointer"
                      onClick={() => handleNavigate(payment.id)}
                    >
                      <td className="px-4 py-3 text-neutral-900">
                        <p className="font-medium">
                          {new Date(payment.createdAt).toLocaleDateString(language, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {new Date(payment.createdAt).toLocaleTimeString(language, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-600">
                        {payment.items.length}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-600">
                        {payment.destinations.length}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-neutral-900 whitespace-nowrap">
                        {total}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={StyleHelper.merge(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
                            statusClass
                          )}
                        >
                          {tPayment(`statuses.${statusKey}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Tooltip content={t('recurrence')}>
                          <Button
                            variant="ghost"
                            size="xs"
                            className="text-warning-500 hover:text-warning-500 hover:bg-transparent active:bg-transparent focus:bg-transparent"
                            aria-label={t('recurrence')}
                            disabled={payment.status !== 'COMPLETED'}
                            onClick={event => {
                              event.stopPropagation()
                              handleRecurrence()
                            }}
                          >
                            <RefreshIcon className="size-4" aria-hidden="true" />
                          </Button>
                        </Tooltip>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  )
}

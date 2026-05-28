import { useTranslation } from 'react-i18next'

import { useNavigate } from '@tanstack/react-router'
import BigNumber from 'bignumber.js'

import { StringHelper, TOKEN } from 'fractapay-shared'

import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Tooltip } from '../components/Tooltip'
import { ORDER_STATUS_CLASSES } from '../constants/order-status'
import { StyleHelper } from '../helpers/StyleHelper'
import { useBreadcrumb } from '../hooks/use-breadcrumb-store'
import { useConversationStore } from '../hooks/use-conversation-store'
import { useLanguageStore } from '../hooks/use-language-store'
import { usePageTitle } from '../hooks/use-page-title'

import EmptyStateIcon from '../assets/icons/empty-state-icon.svg?react'
import RefreshIcon from '../assets/icons/refresh-icon.svg?react'

export const PaymentsPage = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'payments' })
  const { t: tPayment } = useTranslation('pages', { keyPrefix: 'payment' })
  usePageTitle(t('title'))
  useBreadcrumb([{ label: t('title') }])
  const { language } = useLanguageStore()
  const navigate = useNavigate()
  const { conversations } = useConversationStore()

  const processedConversations = conversations
    .filter(conversation => !!conversation.orderId)
    .map(conversation => {
      const total = conversation.totalAmount
        ? StringHelper.formatCurrencyAmount(conversation.totalAmount, TOKEN.TESOURO)
        : conversation.payments.length > 0
          ? StringHelper.formatCurrencyAmount(
              StringHelper.formatAmount(
                conversation.payments.reduce(
                  (sum, payment) => sum.plus(new BigNumber(payment.amount || '0')),
                  new BigNumber(0)
                )
              ),
              TOKEN.TESOURO
            )
          : '—'
      const statusKey = conversation.orderStatus ?? 'created'
      const statusClass = ORDER_STATUS_CLASSES[statusKey] ?? ORDER_STATUS_CLASSES.created

      return { conversation, total, statusKey, statusClass }
    })

  const handleNavigate = (orderId: string) => {
    void navigate({ to: '/payments/$orderId', params: { orderId } })
  }

  const handleRecurrent = () => {
    // TODO: implement recurrent payment
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-sm text-neutral-500 mt-1">{t('subtitle')}</p>
      </div>

      {processedConversations.length === 0 ? (
        <EmptyState icon={EmptyStateIcon} title={t('empty')} description={t('subtitle')} />
      ) : (
        <>
          <ul className="sm:hidden space-y-3">
            {processedConversations.map(({ conversation, total, statusKey, statusClass }) => (
              <li
                key={conversation.id}
                className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden"
              >
                <Button
                  variant="ghost"
                  className="flex w-full text-left p-4 flex-col items-start justify-start gap-0 rounded-none hover:bg-neutral-50 hover:text-neutral-700 active:bg-neutral-50"
                  onClick={() => conversation.orderId && handleNavigate(conversation.orderId)}
                >
                  <div className="flex w-full items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-neutral-900">
                        {new Date(conversation.createdAt).toLocaleDateString(language, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {new Date(conversation.createdAt).toLocaleTimeString(language, {
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
                      payments: conversation.payments.length,
                      recipients: conversation.allocations.length,
                    })}
                  </p>
                  <Tooltip content={t('recurrent')}>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-warning-500 hover:text-warning-500 hover:bg-transparent active:bg-transparent focus:bg-transparent"
                      aria-label={t('recurrent')}
                      onClick={handleRecurrent}
                    >
                      <RefreshIcon className="size-4" aria-hidden="true" />
                    </Button>
                  </Tooltip>
                </div>
              </li>
            ))}
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
                {processedConversations.map(({ conversation, total, statusKey, statusClass }) => (
                  <tr
                    key={conversation.id}
                    className="hover:bg-neutral-50 transition-colors cursor-pointer"
                    onClick={() => conversation.orderId && handleNavigate(conversation.orderId)}
                  >
                    <td className="px-4 py-3 text-neutral-900">
                      <p className="font-medium">
                        {new Date(conversation.createdAt).toLocaleDateString(language, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {new Date(conversation.createdAt).toLocaleTimeString(language, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-600">
                      {conversation.payments.length}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-600">
                      {conversation.allocations.length}
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
                      <Tooltip content={t('recurrent')}>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-warning-500 hover:text-warning-500 hover:bg-transparent active:bg-transparent focus:bg-transparent"
                          aria-label={t('recurrent')}
                          onClick={event => {
                            event.stopPropagation()
                            handleRecurrent()
                          }}
                        >
                          <RefreshIcon className="size-4" aria-hidden="true" />
                        </Button>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  )
}

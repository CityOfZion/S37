import { useTranslation } from 'react-i18next'

import { useNavigate } from '@tanstack/react-router'
import BigNumber from 'bignumber.js'

import { StringHelper, TOKEN } from 'fractapay-shared'

import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { ORDER_STATUS_CLASSES } from '../constants/order-status'
import { StyleHelper } from '../helpers/StyleHelper'
import { useConversationStore } from '../hooks/use-conversation-store'
import { useLanguageStore } from '../hooks/use-language-store'
import { usePageTitle } from '../hooks/use-page-title'

import EmptyStateIcon from '../assets/icons/empty-state-icon.svg?react'

export const PaymentsPage = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'payments' })
  const { t: tPayment } = useTranslation('pages', { keyPrefix: 'payment' })
  const { t: tChat } = useTranslation('pages', { keyPrefix: 'chat' })
  const { t: tChatPaymentsBar } = useTranslation('components', { keyPrefix: 'chatPaymentsBar' })
  usePageTitle(t('title'))
  const { language } = useLanguageStore()
  const navigate = useNavigate()
  const { conversations } = useConversationStore()

  const withOrders = conversations.filter(conversation => !!conversation.orderId)

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
          <p className="text-sm text-neutral-500 mt-1">{t('subtitle')}</p>
        </div>
      </div>

      {withOrders.length === 0 ? (
        <EmptyState icon={EmptyStateIcon} title={t('empty')} description={t('subtitle')} />
      ) : (
        <div className="space-y-3">
          {withOrders.map(conversation => {
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

            return (
              <Button
                key={conversation.id}
                variant="ghost"
                onClick={() =>
                  conversation.orderId &&
                  void navigate({
                    to: '/payments/$orderId',
                    params: { orderId: conversation.orderId },
                  })
                }
                className="w-full text-left rounded-2xl border border-neutral-200 bg-white hover:bg-white shadow-sm px-5 py-4 flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/40 hover:shadow-md transition-all h-auto min-h-0"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="font-semibold text-neutral-900">
                    {(() => {
                      const date = new Date(conversation.createdAt).toLocaleDateString(language, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })

                      return conversation.totalAmount
                        ? tChat('conversationTitle', {
                            date,
                            amount: StringHelper.formatCurrencyAmount(
                              conversation.totalAmount,
                              TOKEN.TESOURO
                            ),
                            recipients: tChatPaymentsBar('allocationsCount', {
                              count: conversation.allocations.length,
                            }),
                          })
                        : tChat('conversationTitleEmpty', { date })
                    })()}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {new Date(conversation.updatedAt).toLocaleDateString(language, {
                      dateStyle: 'medium',
                    })}
                    {' · '}
                    {conversation.allocations.length > 0 &&
                      `${conversation.allocations.length} ${tPayment('recipients')}`}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={StyleHelper.merge(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
                      statusClass
                    )}
                  >
                    {tPayment(`statuses.${statusKey}`)}
                  </span>
                  <span className="font-bold text-neutral-900 text-sm whitespace-nowrap">
                    {total}
                  </span>
                </div>
              </Button>
            )
          })}
        </div>
      )}
    </main>
  )
}

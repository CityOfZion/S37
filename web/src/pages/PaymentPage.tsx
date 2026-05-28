import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useParams } from '@tanstack/react-router'

import { StringHelper, TOKEN } from 'fractapay-shared'

import { Button } from '../components/Button'
import { PixInstructions } from '../components/PixInstructions'
import { RightPanel } from '../components/RightPanel'
import { Skeleton } from '../components/Skeleton'
import { Spinner } from '../components/Spinner'
import { Tooltip } from '../components/Tooltip'
import { ORDER_STATUS_CLASSES } from '../constants/order-status'
import { TOKEN_ICON_URL } from '../constants/token-icons'
import { InputHelper } from '../helpers/InputHelper'
import { StyleHelper } from '../helpers/StyleHelper'
import { useBreadcrumb } from '../hooks/use-breadcrumb-store'
import { useConversationStore } from '../hooks/use-conversation-store'
import { useLanguageStore } from '../hooks/use-language-store'
import { TERMINAL_STATUSES, useOrderQuery } from '../hooks/use-order-query'
import { usePageTitle } from '../hooks/use-page-title'

import RefreshIcon from '../assets/icons/refresh-icon.svg?react'

export const PaymentPage = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'payment' })
  const { t: tPayments } = useTranslation('pages', { keyPrefix: 'payments' })
  const { t: tChat } = useTranslation('pages', { keyPrefix: 'chat' })
  usePageTitle(t('title'))
  const { language } = useLanguageStore()
  const { orderId } = useParams({ from: '/auth/payments/$orderId' })
  const { data, isLoading, isError } = useOrderQuery(orderId)
  const { conversations, updateConversation } = useConversationStore()
  const [copiedTx, setCopiedTx] = useState(false)
  const [paymentsPanel, setPaymentsPanel] = useState(false)

  const conversation = conversations.find(conversation => conversation.orderId === orderId)

  const breadcrumbLabel = conversation
    ? conversation.totalAmount
      ? tChat('conversationTitle', {
          count: conversation.allocations.length,
          date: new Date(conversation.createdAt).toLocaleDateString(language, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          amount: StringHelper.formatCurrencyAmount(conversation.totalAmount, TOKEN.TESOURO),
          recipients: conversation.allocations.length,
        })
      : tChat('conversationTitleEmpty', {
          date: new Date(conversation.createdAt).toLocaleDateString(language, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
        })
    : t('title')

  useBreadcrumb([{ label: tPayments('title'), to: '/payments' }, { label: breadcrumbLabel }])

  useEffect(() => {
    if (!data?.status) return

    const found = conversations.find(conversation => conversation.orderId === orderId)

    if (!found || found.orderStatus === data.status) return

    updateConversation(found.id, { orderStatus: data.status })
  }, [data?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const copyTx = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash)
      setCopiedTx(true)
      setTimeout(() => setCopiedTx(false), 2000)
    } catch {
      // ignore
    }
  }

  const statusKey = data?.status ?? 'created'
  const badgeClass = ORDER_STATUS_CLASSES[statusKey] ?? ORDER_STATUS_CLASSES.created

  return (
    <>
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
          <div className="flex items-center gap-3 flex-wrap flex-row-reverse md:flex-row">
            <Tooltip content={tPayments('recurrent')}>
              <Button
                variant="ghost"
                size="xs"
                className="text-warning-500 hover:text-warning-500 hover:bg-transparent active:bg-transparent focus:bg-transparent"
                aria-label={tPayments('recurrent')}
                onClick={() => {
                  // TODO: implement recurrent payment
                }}
              >
                <RefreshIcon className="size-4" aria-hidden="true" />
              </Button>
            </Tooltip>
            {conversation && conversation.payments.length > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setPaymentsPanel(true)}>
                {t('viewPayments')} ({conversation.payments.length})
              </Button>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 space-y-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-full" />
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
              <Skeleton className="h-px w-full" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-7 w-32" />
              </div>
              <Skeleton className="h-px w-full" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-5/6" />
            </div>
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-danger-600 text-sm">
            {t('error')}
          </div>
        )}

        {data && !isLoading && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-neutral-500 shrink-0">{t('orderId')}</span>
                <span className="font-mono text-xs text-neutral-700 text-right break-all">
                  {data.orderId}
                </span>
              </div>

              {data.confirmedTxSignature && (
                <div className="flex items-start justify-between gap-4 border-t border-neutral-100 pt-3">
                  <span className="text-sm text-neutral-500 shrink-0">{t('txHash')}</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-neutral-700 truncate">
                      {StringHelper.truncateMiddle(data.confirmedTxSignature, 24)}
                    </span>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="px-0 text-primary shrink-0"
                      onClick={() => void copyTx(data.confirmedTxSignature!)}
                    >
                      {copiedTx ? t('copiedTx') : t('copyTx')}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <span className="text-sm font-medium text-neutral-500">{t('status')}</span>
                <div className="flex items-center gap-2">
                  {!TERMINAL_STATUSES.has(data.status) && <Spinner />}
                  <span
                    className={StyleHelper.merge(
                      'px-3 py-1 rounded-full text-sm font-semibold',
                      badgeClass
                    )}
                  >
                    {t(`statuses.${statusKey}`)}
                  </span>
                </div>
              </div>

              {data.amountInFiat && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-neutral-100 pt-4 gap-1">
                  <span className="text-sm text-neutral-500">{t('amount')}</span>
                  <span className="font-bold text-neutral-900 text-lg">
                    {StringHelper.formatCurrencyAmount(data.amountInFiat, TOKEN.TESOURO)}
                  </span>
                </div>
              )}

              {data.amountInTokens && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-neutral-100 pt-4 gap-1">
                  <span className="text-sm text-neutral-500">{t('amountInTokens')}</span>
                  <span className="flex items-center gap-1.5 font-semibold text-neutral-900">
                    {TOKEN_ICON_URL[TOKEN.TESOURO] && (
                      <img
                        src={TOKEN_ICON_URL[TOKEN.TESOURO]}
                        alt=""
                        aria-hidden="true"
                        className="size-5 rounded-full shrink-0"
                      />
                    )}
                    {StringHelper.formatAmount(data.amountInTokens)} {TOKEN.TESOURO}
                  </span>
                </div>
              )}
            </div>

            {(data.pix || (conversation && conversation.allocations.length > 0)) && (
              <div className="flex flex-col lg:flex-row gap-4 items-start">
                {conversation && conversation.allocations.length > 0 && (
                  <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 space-y-3 w-full lg:flex-1">
                    <h2 className="text-sm font-medium text-neutral-500">
                      {t('allocationsTitle')}
                    </h2>
                    <ul className="divide-y divide-neutral-100">
                      {conversation.allocations.map((allocation, index) => {
                        const summaryItem = conversation.summary.find(
                          item => item.destinationName === allocation.destination.name
                        )

                        return (
                          <li
                            key={index}
                            className="flex items-center justify-between gap-4 py-2.5 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-neutral-900 truncate">
                                {allocation.destination.name}
                              </p>
                              <p className="text-xs text-neutral-400 mt-0.5 font-mono">
                                {InputHelper.maskPixKeyDisplay(
                                  allocation.destination.pixKey,
                                  allocation.destination.pixKeyType
                                )}
                                <span className="font-sans uppercase ml-1.5 tracking-wide">
                                  {allocation.destination.pixKeyType}
                                </span>
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              {summaryItem?.amount && (
                                <p className="font-semibold text-neutral-900 text-xs">
                                  {StringHelper.formatCurrencyAmount(
                                    summaryItem.amount,
                                    TOKEN.TESOURO
                                  )}
                                </p>
                              )}
                              <p className="text-neutral-400 text-xs">{allocation.percentage}%</p>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                {data.pix && (
                  <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 w-full lg:flex-1">
                    <PixInstructions pix={data.pix} orderId={data.orderId} hideRedirectMessage />
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-neutral-400 text-center select-none">
              {new Date().toLocaleDateString(language, { dateStyle: 'long' })}
            </p>
          </div>
        )}
      </main>

      <RightPanel
        open={paymentsPanel}
        onClose={() => setPaymentsPanel(false)}
        title={t('viewPayments')}
      >
        {!conversation || conversation.payments.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('noPayments')}</p>
        ) : (
          <ul className="space-y-3">
            {conversation.payments.map(payment => (
              <li key={payment.id} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-neutral-700 wrap-break-word min-w-0">
                  {payment.description ?? '—'}
                </span>
                <span className="font-semibold text-neutral-900 shrink-0">
                  {StringHelper.formatCurrencyAmount(payment.amount, TOKEN.TESOURO)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </RightPanel>
    </>
  )
}

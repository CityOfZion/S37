import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useNavigate, useParams } from '@tanstack/react-router'

import { StringHelper, TOKEN } from 'fractapay-shared'

import { Button } from '../components/Button'
import { PixInstructions } from '../components/PixInstructions'
import { Skeleton } from '../components/Skeleton'
import { Spinner } from '../components/Spinner'
import { ORDER_STATUS_CLASSES } from '../constants/order-status'
import { TOKEN_ICON_URL } from '../constants/token-icons'
import { StyleHelper } from '../helpers/StyleHelper'
import { useConversationStore } from '../hooks/use-conversation-store'
import { useLanguageStore } from '../hooks/use-language-store'
import { TERMINAL_STATUSES, useOrderQuery } from '../hooks/use-order-query'
import { usePageTitle } from '../hooks/use-page-title'

export const PaymentPage = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'payment' })
  usePageTitle(t('title'))
  const navigate = useNavigate()
  const { language } = useLanguageStore()
  const { orderId } = useParams({ from: '/auth/payments/$orderId' })
  const { data, isLoading, isError } = useOrderQuery(orderId)
  const { conversations, updateConversation } = useConversationStore()
  const [copiedTx, setCopiedTx] = useState(false)

  useEffect(() => {
    if (!data?.status) return

    const conversation = conversations.find(conversation => conversation.orderId === orderId)

    if (!conversation || conversation.orderStatus === data.status) return

    updateConversation(conversation.id, { orderStatus: data.status })
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
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <Button variant="outline" onClick={() => void navigate({ to: '/payments' })}>
          {t('back')}
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 space-y-5">
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 space-y-5">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-3/4" />
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
              <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
                <span className="text-sm text-neutral-500">{t('amount')}</span>
                <span className="font-bold text-neutral-900 text-lg">
                  {StringHelper.formatCurrencyAmount(data.amountInFiat, TOKEN.TESOURO)}
                </span>
              </div>
            )}

            {data.amountInTokens && (
              <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
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

          {data.pix && (
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6">
              <PixInstructions pix={data.pix} orderId={data.orderId} hideRedirectMessage />
            </div>
          )}

          <p className="text-xs text-neutral-400 text-center select-none">
            {new Date().toLocaleDateString(language, { dateStyle: 'long' })}
          </p>
        </div>
      )}
    </main>
  )
}

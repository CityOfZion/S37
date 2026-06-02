import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useParams } from '@tanstack/react-router'
import BigNumber from 'bignumber.js'

import { FIAT_BY_TOKEN, StringHelper } from 'fractapay-shared'

import { Accordion } from '../../components/Accordion'
import { Button } from '../../components/Button'
import { ErrorState } from '../../components/ErrorState'
import { FeeIcon } from '../../components/FeeIcon'
import { PixContent } from '../../components/PixContent'
import { RightPanel } from '../../components/RightPanel'
import { Skeleton } from '../../components/Skeleton'
import { Spinner } from '../../components/Spinner'
import { TokenIcon } from '../../components/TokenIcon'
import { Tooltip } from '../../components/Tooltip'
import { EMPTY_VALUE, PAYMENT_STATUS_CLASSES } from '../../constants'
import { InputHelper } from '../../helpers/InputHelper'
import { StyleHelper } from '../../helpers/StyleHelper'
import { useBreadcrumb } from '../../hooks/use-breadcrumb-store'
import { useLanguageStore } from '../../hooks/use-language-store'
import { usePageTitle } from '../../hooks/use-page-title'
import { TERMINAL_STATUSES, usePaymentQuery } from '../../hooks/use-payment-query'

import RefreshIcon from '../../assets/icons/refresh-icon.svg?react'

export const PaymentPage = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'payment' })
  const { t: tPayments } = useTranslation('pages', { keyPrefix: 'payments' })
  const { t: tCommon } = useTranslation('common')
  usePageTitle(t('title'))
  const { language } = useLanguageStore()
  const { id: paymentId } = useParams({ from: '/auth/payments/$id' })
  const { data: paymentData, isLoading, isError } = usePaymentQuery(paymentId)
  const payment = paymentData || null
  const [copiedTx, setCopiedTx] = useState(false)
  const [itemsPanel, setItemsPanel] = useState(false)

  const breadcrumbLabel = payment?.amount
    ? tCommon('paymentTitle', {
        count: payment.destinations.length,
        date: new Date(payment.createdAt).toLocaleDateString(language, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        amount: StringHelper.formatCurrencyAmount(payment.amount, payment.token),
        recipients: payment.destinations.length,
      })
    : t('title')

  useBreadcrumb([{ label: tPayments('title'), to: '/payments' }, { label: breadcrumbLabel }])

  const copyTx = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash)
      setCopiedTx(true)
      setTimeout(() => setCopiedTx(false), 2000)
    } catch {
      // ignore
    }
  }

  const statusKey = payment?.status || 'CREATED'
  const badgeClass = PAYMENT_STATUS_CLASSES[statusKey] || PAYMENT_STATUS_CLASSES.CREATED

  return (
    <>
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
          <div className="flex items-center gap-3 flex-wrap flex-row-reverse md:flex-row">
            <Tooltip content={tPayments('recurrence')}>
              <Button
                variant="ghost"
                size="xs"
                className="text-warning-500 hover:text-warning-500 hover:bg-transparent active:bg-transparent focus:bg-transparent"
                aria-label={tPayments('recurrence')}
                disabled={payment?.status !== 'COMPLETED'}
                onClick={() => {
                  // TODO: implement recurrence
                }}
              >
                <RefreshIcon className="size-4" aria-hidden="true" />
              </Button>
            </Tooltip>
            {payment && payment.items.length > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setItemsPanel(true)}>
                {t('viewPayments')} ({payment.items.length})
              </Button>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
              <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-28" />
              </div>
              <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-28" />
              </div>
              <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-28" />
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-5">
              <Skeleton className="h-4 w-36" />
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
              <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 flex-1 space-y-4">
                <Skeleton className="h-44 w-44 mx-auto rounded-xl" />
                <Skeleton className="h-4 w-32 mx-auto" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 flex-1 h-fit space-y-3">
                <Skeleton className="h-4 w-24" />
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </div>
          </div>
        )}

        {isError && <ErrorState title={t('error')} />}

        {payment && !isLoading && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <span className="text-sm font-medium text-neutral-500">{t('status')}</span>
                <div className="flex items-center gap-2">
                  {!TERMINAL_STATUSES.has(payment.status) && <Spinner />}
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

              {payment.amount && (
                <>
                  {payment.feeAmount && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-neutral-100 pt-4 gap-1">
                      <span className="flex items-center gap-1 text-sm text-neutral-500">
                        {t('feeAmount')}
                        <FeeIcon
                          label={t('feeAmountTooltip', { fee: payment.feePercentage })}
                          className="size-3.5 text-neutral-400"
                        />
                      </span>
                      <span className="text-sm text-neutral-700">
                        {StringHelper.formatCurrencyAmount(payment.feeAmount, payment.token)}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-neutral-100 pt-4 gap-1">
                    <span className="text-sm text-neutral-500">{t('amount')}</span>
                    <span className="text-sm text-neutral-700">
                      {StringHelper.formatCurrencyAmount(payment.amount, payment.token)}
                    </span>
                  </div>
                  {payment.feeAmount && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-neutral-100 pt-4 gap-1 font-bold">
                      <span className="text-sm text-neutral-700">{t('totalAmount')}</span>
                      <span className="text-neutral-900 text-lg">
                        {StringHelper.formatCurrencyAmount(
                          StringHelper.formatAmount(
                            new BigNumber(payment.amount).plus(payment.feeAmount)
                          ),
                          payment.token
                        )}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <Accordion
              value="technical"
              className="shadow-sm rounded-2xl"
              trigger={t('technicalDetails')}
            >
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="text-sm text-neutral-500 shrink-0">{t('externalId')}</span>
                  <span className="font-mono text-xs text-neutral-700 wrap-break-word">
                    {payment.externalId}
                  </span>
                </div>

                {payment.transactionSignature && (
                  <div className="flex items-start justify-between gap-4 border-t border-neutral-100 pt-3">
                    <span className="text-sm text-neutral-500 shrink-0">{t('txHash')}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-neutral-700 truncate">
                        {StringHelper.truncateMiddle(payment.transactionSignature, 24)}
                      </span>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="px-0 text-primary shrink-0"
                        onClick={() => void copyTx(payment.transactionSignature!)}
                      >
                        {copiedTx ? t('copiedTx') : t('copyTx')}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-neutral-100 pt-3 gap-1">
                  <span className="text-sm text-neutral-500">{t('amountInTokens')}</span>
                  <span className="flex items-center gap-1 font-semibold text-neutral-900">
                    <TokenIcon token={payment.token} className="size-5" />
                    {StringHelper.formatAmount(payment.tokenAmount)} {payment.token}
                  </span>
                </div>

                {payment.exchangeRate && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-t border-neutral-100 pt-3">
                    <span className="text-sm text-neutral-500 shrink-0">{t('rate')}</span>
                    <span className="font-mono text-xs text-neutral-700">
                      {tCommon('rateValue', {
                        fiat: tCommon(`fiatBySymbol.${FIAT_BY_TOKEN[payment.token]}`).toLowerCase(),
                        rate: StringHelper.formatAmount(payment.exchangeRate),
                        token: payment.token,
                      })}
                    </span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-neutral-100 pt-3 gap-1">
                  <span className="text-sm text-neutral-500 shrink-0">{t('address')}</span>
                  <span className="font-mono text-xs text-neutral-700 wrap-break-word">
                    {payment.address}
                  </span>
                </div>
              </div>
            </Accordion>

            {(payment.pix || payment.destinations.length > 0) && (
              <div className="flex flex-col lg:flex-row gap-4 items-start">
                {payment.pix && (
                  <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 w-full lg:flex-1">
                    <PixContent pix={payment.pix} paymentId={paymentId} hideRedirectMessage />
                  </div>
                )}

                {payment.destinations.length > 0 && (
                  <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 space-y-3 w-full lg:flex-1">
                    <h2 className="text-sm font-medium text-neutral-500">
                      {t('destinationsTitle')}
                    </h2>
                    <ul className="divide-y divide-neutral-100">
                      {payment.destinations.map(destination => (
                        <li
                          key={destination.id}
                          className="flex items-center justify-between gap-4 py-2.5 text-sm first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-neutral-900 truncate">
                              {destination.name}
                            </p>
                            <p className="text-xs text-neutral-400 font-mono">
                              {InputHelper.maskPixKeyDisplay(
                                destination.pixKey,
                                destination.pixKeyType
                              )}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-semibold text-neutral-900 text-xs">
                              {StringHelper.formatCurrencyAmount(destination.amount, payment.token)}
                            </p>
                            <p className="text-neutral-400 text-xs">{destination.percentage}%</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-neutral-400 text-center select-none">
              {new Date(payment.createdAt).toLocaleDateString(language, { dateStyle: 'long' })}
            </p>
          </div>
        )}
      </main>

      <RightPanel open={itemsPanel} onClose={() => setItemsPanel(false)} title={t('viewPayments')}>
        {!payment || payment.items.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('noPayments')}</p>
        ) : (
          <ul className="space-y-2">
            {payment.items.map(item => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-neutral-100 bg-white px-4 py-3 shadow-sm"
              >
                <span className="text-sm text-neutral-700 wrap-break-word min-w-0 leading-snug">
                  {item.description || (
                    <span className="text-neutral-400 italic">{EMPTY_VALUE}</span>
                  )}
                </span>
                <span className="text-sm font-semibold text-neutral-900 shrink-0 tabular-nums">
                  {StringHelper.formatCurrencyAmount(item.amount, payment.token)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </RightPanel>
    </>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useNavigate } from '@tanstack/react-router'
import BigNumber from 'bignumber.js'
import { match } from 'ts-pattern'

import type { TKycStatus, TOrderResult, TQuoteResult } from 'fractapay-shared'
import {
  FEE_PERCENTAGE,
  QUOTE_EXPIRY_SECONDS,
  RECIPIENT_PERCENTAGE,
  StringHelper,
} from 'fractapay-shared'

import tesouroIconUrl from '../assets/icons/tesouro-icon.webp'
import { ToastHelper } from '../helpers/ToastHelper'
import { useCountdown } from '../hooks/use-countdown'
import { useEtherfuseStore } from '../hooks/use-etherfuse-store'
import { useKycStatusQuery } from '../hooks/use-kyc-status-query'
import { useOnboardingMutation } from '../hooks/use-onboarding-mutation'
import { useOrderMutation } from '../hooks/use-order-mutation'
import { usePaymentsStore } from '../hooks/use-payments-store'
import { useQuoteMutation } from '../hooks/use-quote-mutation'
import { Accordion } from './Accordion'
import { Button } from './Button'
import { CountdownRing } from './CountdownRing'
import { Modal } from './Modal'
import { PixInstructions } from './PixInstructions'

type TProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipientAddress: string
}

export const ReviewModal = ({ open, onOpenChange, recipientAddress }: TProps) => {
  const { t } = useTranslation('components', { keyPrefix: 'reviewModal' })
  const navigate = useNavigate()
  const { payments, token, setPayments } = usePaymentsStore()
  const account = useEtherfuseStore(state => state.accounts[recipientAddress])
  const setAccount = useEtherfuseStore(state => state.setAccount)
  const onboardingMutation = useOnboardingMutation()
  const quoteMutation = useQuoteMutation()
  const orderMutation = useOrderMutation()
  const [order, setOrder] = useState<TOrderResult | null>(null)

  const kycQuery = useKycStatusQuery({
    customerId: account?.customerId || '',
    publicKey: recipientAddress,
    enabled: open && !!account?.customerId,
  })

  const totalAmount = useMemo(
    () =>
      StringHelper.formatAmount(
        payments.reduce(
          (accumulator, payment) => accumulator.plus(new BigNumber(payment.amount || '0')),
          new BigNumber('0')
        )
      ),
    [payments]
  )

  const recipientAmount = useMemo(
    () => StringHelper.formatAmount(new BigNumber(totalAmount).times(RECIPIENT_PERCENTAGE)),
    [totalAmount]
  )

  const quote: TQuoteResult | undefined = quoteMutation.data

  const etherfuseFeeAmount = useMemo(
    () => StringHelper.formatAmount(quote?.etherfuseFeeAmount || '0'),
    [quote?.etherfuseFeeAmount]
  )

  const fractapayFeeAmount = useMemo(() => {
    if (quote?.fractapayFeeAmount) return StringHelper.formatAmount(quote.fractapayFeeAmount)

    return StringHelper.formatAmount(new BigNumber(recipientAmount).times(FEE_PERCENTAGE))
  }, [recipientAmount, quote?.fractapayFeeAmount])

  const feeAmount = useMemo(
    () => StringHelper.formatAmount(new BigNumber(etherfuseFeeAmount).plus(fractapayFeeAmount)),
    [etherfuseFeeAmount, fractapayFeeAmount]
  )

  const totalToPay = useMemo(
    () => StringHelper.formatAmount(new BigNumber(recipientAmount).plus(feeAmount)),
    [recipientAmount, feeAmount]
  )

  const quoteMutateRef = useRef(quoteMutation.mutate)
  quoteMutateRef.current = quoteMutation.mutate

  const inFlightRef = useRef(false)

  const fetchQuote = useCallback(() => {
    if (inFlightRef.current) return
    if (!account?.customerId) return
    if (new BigNumber(recipientAmount).isLessThanOrEqualTo(0)) return

    inFlightRef.current = true
    quoteMutateRef.current(
      {
        customerId: account.customerId,
        sourceAmount: recipientAmount,
        token,
        publicKey: recipientAddress,
      },
      {
        onSettled: () => {
          inFlightRef.current = false
        },
      }
    )
  }, [account?.customerId, recipientAddress, recipientAmount, token])

  const { remainingSeconds, isExpired } = useCountdown(quote?.expiresAt || null)

  const kycStatusForEffect = kycQuery.data?.status
  const hasQuote = !!quoteMutation.data

  useEffect(() => {
    if (!open || !account?.customerId || kycStatusForEffect !== 'approved') return
    if (hasQuote && !isExpired) return

    fetchQuote()
  }, [open, account?.customerId, kycStatusForEffect, hasQuote, isExpired, fetchQuote])

  const quoteResetRef = useRef(quoteMutation.reset)
  const orderResetRef = useRef(orderMutation.reset)

  quoteResetRef.current = quoteMutation.reset
  orderResetRef.current = orderMutation.reset

  useEffect(() => {
    if (!open) {
      quoteResetRef.current()
      orderResetRef.current()
      setOrder(null)
    }
  }, [open])

  const startOnboarding = () => {
    onboardingMutation.mutate(
      { publicKey: recipientAddress },
      {
        onSuccess: result => {
          setAccount(recipientAddress, {
            customerId: result.customerId,
            bankAccountId: result.bankAccountId,
            presignedUrl: result.presignedUrl,
          })

          if (!result.presignedUrl) return

          window.open(result.presignedUrl, '_blank', 'noopener,noreferrer')
        },
        onError: () => ToastHelper.error(t('onboardingError')),
      }
    )
  }

  const continueKyc = () => {
    if (!account?.customerId || !account.presignedUrl) return

    window.open(account.presignedUrl, '_blank', 'noopener,noreferrer')
  }

  const confirm = () => {
    if (!quote || isExpired || !account?.customerId || !account.bankAccountId) return

    orderMutation.mutate(
      {
        quoteId: quote.quoteId,
        customerId: account.customerId,
        bankAccountId: account.bankAccountId,
        publicKey: recipientAddress,
        memo: `FractaPay batch ${new Date().toISOString()}`,
      },
      {
        onSuccess: result => {
          setOrder(result)
          ToastHelper.success(t('orderCreated'))
        },
        onError: () => ToastHelper.error(t('orderError')),
      }
    )
  }

  const kycStatus: TKycStatus = kycQuery.data?.status || 'not_started'
  const isReadyForQuote = !!account?.customerId && kycStatus === 'approved'

  const renderHeaderState = () =>
    match({
      hasCustomer: !!account?.customerId,
      kycStatus,
    })
      .with({ hasCustomer: false }, () => (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {t('kycRequired')}
        </div>
      ))
      .with({ kycStatus: 'not_started' }, () => (
        <div className="rounded-xl border border-blue-400/30 bg-blue-400/10 px-4 py-3 text-sm text-blue-200">
          {t('kycPending')}
        </div>
      ))
      .with({ kycStatus: 'pending' }, () => (
        <div className="rounded-xl border border-blue-400/30 bg-blue-400/10 px-4 py-3 text-sm text-blue-200">
          {t('kycPending')}
        </div>
      ))
      .with({ kycStatus: 'rejected' }, () => (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {t('kycRejected')}
        </div>
      ))
      .otherwise(() => null)

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      description={t('description')}
      closeLabel={t('close')}
    >
      {order?.pix ? (
        <PixInstructions
          pix={order.pix}
          orderId={order.orderId}
          onSimulated={() => {
            onOpenChange(false)
            setPayments([])
            void navigate({ to: '/payment/$orderId', params: { orderId: order.orderId } })
          }}
        />
      ) : (
        <div className="space-y-4">
          {renderHeaderState()}

          <section aria-label={t('recipientsTitle')} className="space-y-2">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              {t('recipientsTitle')}
            </h3>

            <div className="rounded-xl border border-white/10 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase">
                      {t('address')}
                    </th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-400 uppercase">
                      {t('percentage')}
                    </th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-400 uppercase">
                      {t('amount')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2 font-mono text-white">
                      {StringHelper.truncateMiddle(recipientAddress, 20)}
                    </td>
                    <td className="px-4 py-2 text-right text-white">
                      {RECIPIENT_PERCENTAGE.times(100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-white whitespace-nowrap">
                      {StringHelper.formatCurrencyAmount(recipientAmount, token)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <Accordion
            value="fees"
            defaultOpen
            trigger={
              <span className="flex items-center gap-2">
                <img
                  src={tesouroIconUrl}
                  alt=""
                  aria-hidden="true"
                  className="size-5 rounded-full object-cover"
                />
                <span>{t('feesTitle')}</span>
              </span>
            }
          >
            <dl className="space-y-1.5">
              <div className="flex items-center justify-between">
                <dt>{t('subtotal')}</dt>
                <dd>{StringHelper.formatCurrencyAmount(recipientAmount, token)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>{t('etherfuseFee')}</dt>
                <dd>{StringHelper.formatCurrencyAmount(etherfuseFeeAmount, token)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>{t('fractapayFee', { percentage: FEE_PERCENTAGE.times(100).toFixed(1) })}</dt>
                <dd>{StringHelper.formatCurrencyAmount(fractapayFeeAmount, token)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-2">
                <dt className="text-white font-semibold">{t('total')}</dt>
                <dd className="text-white font-semibold">
                  {StringHelper.formatCurrencyAmount(totalToPay, token)}
                </dd>
              </div>
              {quote && (
                <div className="flex items-center justify-between pt-2 text-xs text-gray-400">
                  <dt>{t('rate')}</dt>
                  <dd>
                    1 BRL ≈ {StringHelper.formatAmount(quote.exchangeRate)} {token}
                  </dd>
                </div>
              )}
            </dl>
          </Accordion>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <CountdownRing
              expiresAt={quote?.expiresAt || null}
              remainingSeconds={remainingSeconds}
              totalSeconds={QUOTE_EXPIRY_SECONDS}
              isExpired={isExpired || !quote}
              isRefreshing={quoteMutation.isPending}
              onRefresh={fetchQuote}
            />

            {match({
              hasCustomer: !!account?.customerId,
              kycStatus,
              isReadyForQuote,
            })
              .with({ hasCustomer: false }, () => (
                <Button disabled={onboardingMutation.isPending} onClick={startOnboarding}>
                  {onboardingMutation.isPending ? t('startingKyc') : t('startKyc')}
                </Button>
              ))
              .with({ kycStatus: 'not_started' }, () => (
                <Button variant="outline" onClick={continueKyc}>
                  {t('continueKyc')}
                </Button>
              ))
              .with({ kycStatus: 'pending' }, () => (
                <Button variant="outline" onClick={continueKyc}>
                  {t('continueKyc')}
                </Button>
              ))
              .with({ kycStatus: 'rejected' }, () => (
                <Button variant="outline" onClick={continueKyc}>
                  {t('retryKyc')}
                </Button>
              ))
              .with({ isReadyForQuote: true }, () => (
                <Button
                  disabled={
                    !quote ||
                    isExpired ||
                    quoteMutation.isPending ||
                    orderMutation.isPending ||
                    !account?.bankAccountId
                  }
                  onClick={confirm}
                >
                  {orderMutation.isPending ? t('confirming') : t('confirm')}
                </Button>
              ))
              .otherwise(() => null)}
          </div>
        </div>
      )}
    </Modal>
  )
}

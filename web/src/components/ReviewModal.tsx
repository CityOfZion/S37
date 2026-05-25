import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useNavigate } from '@tanstack/react-router'
import BigNumber from 'bignumber.js'
import { match } from 'ts-pattern'

import type {
  TDestinationAllocation,
  TKycStatus,
  TOrderResult,
  TQuoteResult,
} from 'fractapay-shared'
import { FEE_PERCENTAGE, FIAT_BY_TOKEN, QUOTE_EXPIRY_SECONDS, StringHelper } from 'fractapay-shared'

import tesouroIconUrl from '../assets/icons/tesouro-icon.webp'
import { ToastHelper } from '../helpers/ToastHelper'

const TOKEN_ICON_URL: Partial<Record<string, string>> = {
  TESOURO: tesouroIconUrl,
}

import { useCountdown } from '../hooks/use-countdown'
import { useCustomerLookupQuery } from '../hooks/use-customer-lookup-query'
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
import { Skeleton } from './Skeleton'
import { Tooltip } from './Tooltip'

import InfoIcon from '../assets/icons/info-icon.svg?react'

const TruncatedAddress = ({ address }: { address: string }) => {
  const [open, setOpen] = useState(false)

  return (
    <dd className="font-mono text-right">
      <Tooltip content={address} open={open} onOpenChange={setOpen}>
        <span
          tabIndex={0}
          className="sm:hidden cursor-pointer"
          onClick={() => setOpen(previous => !previous)}
          onKeyDown={event => event.key === 'Enter' && setOpen(previous => !previous)}
        >
          {StringHelper.truncateMiddle(address, 24)}
        </span>
      </Tooltip>
      <span className="hidden sm:inline break-all">{address}</span>
    </dd>
  )
}

type TProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipientAddress: string
  allocations: TDestinationAllocation[]
  onPaymentCompleted?: () => void
}

export const ReviewModal = ({
  open,
  onOpenChange,
  recipientAddress,
  allocations,
  onPaymentCompleted,
}: TProps) => {
  const { t } = useTranslation('components', { keyPrefix: 'reviewModal' })
  const navigate = useNavigate()
  const { payments, token, setPayments } = usePaymentsStore()
  const account = useEtherfuseStore(state => state.accounts[recipientAddress])
  const setAccount = useEtherfuseStore(state => state.setAccount)
  const removeAccount = useEtherfuseStore(state => state.removeAccount)
  const onboardingMutation = useOnboardingMutation()
  const quoteMutation = useQuoteMutation()
  const orderMutation = useOrderMutation()
  const [order, setOrder] = useState<TOrderResult | null>(null)
  const [feeTooltipOpen, setFeeTooltipOpen] = useState(false)
  const [quoteReady, setQuoteReady] = useState(false)
  const [quote, setQuote] = useState<TQuoteResult | null>(null)
  const [isQuotePending, setIsQuotePending] = useState(false)

  const customerLookupQuery = useCustomerLookupQuery({
    publicKey: recipientAddress,
    enabled: open && !account?.customerId,
  })

  useEffect(() => {
    const found = customerLookupQuery.data

    if (!found || account?.customerId) return

    setAccount(recipientAddress, {
      customerId: found.customerId,
      bankAccountId: found.bankAccountId,
      presignedUrl: found.presignedUrl,
    })
  }, [customerLookupQuery.data, account?.customerId, recipientAddress, setAccount])

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
    () =>
      StringHelper.formatAmount(
        new BigNumber(totalAmount).times(
          allocations.reduce((sum, allocation) => sum + allocation.percentage, 0) / 100
        )
      ),
    [totalAmount, allocations]
  )

  const feeAmount = useMemo(
    () => StringHelper.formatAmount(new BigNumber(quote?.feeAmount || '0')),
    [quote?.feeAmount]
  )

  const totalToPay = useMemo(
    () => StringHelper.formatAmount(new BigNumber(recipientAmount).plus(feeAmount)),
    [recipientAmount, feeAmount]
  )

  const inFlightRef = useRef(false)
  const quoteMutateAsyncRef = useRef(quoteMutation.mutateAsync)
  const quoteResetRef = useRef(quoteMutation.reset)
  quoteMutateAsyncRef.current = quoteMutation.mutateAsync
  quoteResetRef.current = quoteMutation.reset

  const fetchQuote = useCallback(async () => {
    if (inFlightRef.current) return
    if (!account?.customerId) return
    if (new BigNumber(recipientAmount).isLessThanOrEqualTo(0)) return

    setQuote(null)
    setQuoteReady(false)
    setIsQuotePending(true)
    inFlightRef.current = true

    try {
      const result = await quoteMutateAsyncRef.current({
        customerId: account.customerId,
        sourceAmount: recipientAmount,
        token,
        publicKey: recipientAddress,
      })
      setQuote(result)
      setQuoteReady(true)
    } catch {
      removeAccount(recipientAddress)
      ToastHelper.error(t('orderError'))
    } finally {
      inFlightRef.current = false
      setIsQuotePending(false)
    }
  }, [account?.customerId, recipientAmount, token, recipientAddress, removeAccount, t])

  const { remainingSeconds, isExpired } = useCountdown(quote?.expiresAt || null)

  const kycStatusForEffect = kycQuery.data?.status
  const hasQuote = !!quote
  const isQuoteError = quoteMutation.isError

  useEffect(() => {
    if (!open || !account?.customerId || kycStatusForEffect !== 'approved') return
    if (hasQuote && !isExpired) return
    if (isQuoteError) return

    void fetchQuote()
  }, [open, account?.customerId, kycStatusForEffect, hasQuote, isExpired, isQuoteError, fetchQuote])

  const orderResetRef = useRef(orderMutation.reset)

  orderResetRef.current = orderMutation.reset

  useEffect(() => {
    if (!open) {
      inFlightRef.current = false
      setQuote(null)
      setQuoteReady(false)
      setIsQuotePending(false)
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

  const isLookingUpCustomer = customerLookupQuery.isFetching && !account?.customerId

  const renderHeaderState = () =>
    match({
      isLookingUpCustomer,
      hasCustomer: !!account?.customerId,
      kycStatus,
    })
      .with({ isLookingUpCustomer: true }, () => (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-700 flex items-center gap-2">
          <span
            className="inline-block size-4 rounded-full border-2 border-neutral-300 border-t-primary animate-spin shrink-0"
            aria-hidden="true"
          />
          {t('lookingUpCustomer')}
        </div>
      ))
      .with({ hasCustomer: false }, () => (
        <div className="rounded-xl border border-warning-500/30 bg-warning-100 px-4 py-3 text-xs text-neutral-700">
          {t('kycRequired')}
        </div>
      ))
      .with({ kycStatus: 'not_started' }, { kycStatus: 'pending' }, () => (
        <div className="rounded-xl border border-info-500/30 bg-info-100 px-4 py-3 text-xs text-neutral-700">
          {t('kycPending')}
        </div>
      ))
      .with({ kycStatus: 'rejected' }, () => (
        <div className="rounded-xl border border-danger-500/30 bg-danger-100 px-4 py-3 text-xs text-neutral-700">
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
      preventClose
    >
      {order?.pix ? (
        <PixInstructions
          pix={order.pix}
          orderId={order.orderId}
          onSimulated={() => {
            onPaymentCompleted?.()
            onOpenChange(false)
            setPayments([])
            void navigate({ to: '/payment/$orderId', params: { orderId: order.orderId } })
          }}
        />
      ) : (
        <div className="space-y-4">
          {renderHeaderState()}

          <div className="flex items-start gap-2 text-xs rounded-xl border border-info-500/30 bg-info-100 px-3 py-2 text-neutral-700">
            <InfoIcon className="size-4 shrink-0 text-info-500 mt-0.5" aria-hidden="true" />
            <p>{t('reviewWarning')}</p>
          </div>

          <section aria-label={t('recipientsTitle')} className="space-y-2">
            <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              {t('recipientsTitle')}
            </h3>

            <div className="rounded-xl border border-neutral-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-neutral-500 uppercase">
                      {t('recipient')}
                    </th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-neutral-500 uppercase">
                      {t('percentage')}
                    </th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-neutral-500 uppercase">
                      {t('amount')}
                    </th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {allocations.map(allocation => {
                    const allocationAmount = StringHelper.formatAmount(
                      new BigNumber(totalAmount).times(allocation.percentage / 100)
                    )

                    return (
                      <tr key={allocation.destination.id}>
                        <td className="px-4 py-2 text-neutral-900">
                          {allocation.destination.name}
                        </td>
                        <td className="px-4 py-2 text-right text-neutral-900">
                          {allocation.percentage}%
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-neutral-900 whitespace-nowrap">
                          {StringHelper.formatCurrencyAmount(allocationAmount, token)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <Accordion defaultOpen value="fees" trigger={<span>{t('feesTitle')}</span>}>
            <dl className="text-xs text-neutral-700">
              <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100">
                <dt className="text-neutral-500">{t('coinLabel')}</dt>
                <dd className="flex items-center gap-1.5">
                  {TOKEN_ICON_URL[token] && (
                    <img
                      src={TOKEN_ICON_URL[token]}
                      alt={token}
                      className="size-4 rounded-full object-cover"
                    />
                  )}
                  <span>{token}</span>
                </dd>
              </div>
              {isReadyForQuote && (
                <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
                  <dt className="text-neutral-500">{t('rate')}</dt>
                  <dd>
                    {!quoteReady ? (
                      <Skeleton />
                    ) : (
                      t('rateValue', {
                        fiat: t(`fiatByToken.${FIAT_BY_TOKEN[token]}`).toLowerCase(),
                        rate: StringHelper.formatAmount(quote?.exchangeRate ?? '0'),
                        token,
                      })
                    )}
                  </dd>
                </div>
              )}
              {recipientAddress && (
                <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
                  <dt className="text-neutral-500">{t('address')}</dt>
                  <TruncatedAddress address={recipientAddress} />
                </div>
              )}
              <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
                <dt className="text-neutral-500">{t('subtotal')}</dt>
                <dd>{StringHelper.formatCurrencyAmount(recipientAmount, token)}</dd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
                <dt className="flex items-center gap-1 text-neutral-500">
                  {t('feeLabel')}
                  <Tooltip
                    content={t('feeTooltip', { fee: FEE_PERCENTAGE.times(100).toFixed(0) })}
                    open={feeTooltipOpen}
                    onOpenChange={setFeeTooltipOpen}
                  >
                    <span
                      tabIndex={0}
                      className="inline-flex cursor-pointer"
                      aria-label={t('feeTooltip', { fee: FEE_PERCENTAGE.times(100).toFixed(0) })}
                      onClick={() => setFeeTooltipOpen(previous => !previous)}
                      onKeyDown={event =>
                        event.key === 'Enter' && setFeeTooltipOpen(previous => !previous)
                      }
                    >
                      <InfoIcon className="size-3 text-neutral-400" aria-hidden="true" />
                    </span>
                  </Tooltip>
                </dt>
                <dd>
                  {!quoteReady ? <Skeleton /> : StringHelper.formatCurrencyAmount(feeAmount, token)}
                </dd>
              </div>
              <div className="flex items-center justify-between pt-1.5">
                <dt className="font-bold text-neutral-900">{t('total')}</dt>
                <dd className="font-bold text-neutral-900">
                  {!quoteReady ? (
                    <Skeleton className="h-3 w-24" />
                  ) : (
                    StringHelper.formatCurrencyAmount(totalToPay, token)
                  )}
                </dd>
              </div>
            </dl>
          </Accordion>

          <div className="flex flex-row-reverse sm:flex-row items-center justify-between flex-wrap gap-3">
            <CountdownRing
              expiresAt={quote?.expiresAt || null}
              remainingSeconds={remainingSeconds}
              totalSeconds={QUOTE_EXPIRY_SECONDS}
              isExpired={isExpired || !quote}
              isRefreshing={isQuotePending}
              onRefresh={() => {
                void fetchQuote()
              }}
            />

            {match({
              isLookingUpCustomer,
              hasCustomer: !!account?.customerId,
              kycStatus,
              isReadyForQuote,
            })
              .with({ isLookingUpCustomer: true }, () => null)
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
                  className="w-full sm:w-auto"
                  disabled={
                    !quote ||
                    isExpired ||
                    isQuotePending ||
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useNavigate } from '@tanstack/react-router'
import BigNumber from 'bignumber.js'
import { match } from 'ts-pattern'

import type {
  TChatDestination,
  TChatMessage,
  TKycStatus,
  TPayment,
  TPaymentItem,
  TQuoteResult,
} from 'fractapay-shared'
import { FEE_PERCENTAGE, FIAT_BY_TOKEN, QUOTE_EXPIRY_SECONDS, StringHelper } from 'fractapay-shared'

import { Accordion } from '../components/Accordion'
import { Button } from '../components/Button'
import { CountdownRing } from '../components/CountdownRing'
import { FeeIcon } from '../components/FeeIcon'
import { Modal } from '../components/Modal'
import { PixContent } from '../components/PixContent'
import { Skeleton } from '../components/Skeleton'
import { TokenIcon } from '../components/TokenIcon'
import { Tooltip } from '../components/Tooltip'
import { ToastHelper } from '../helpers/ToastHelper'
import { useCountdown } from '../hooks/use-countdown'
import { useCreatePaymentMutation } from '../hooks/use-create-payment-mutation'
import { useCustomerLookupQuery } from '../hooks/use-customer-lookup-query'
import { useKycStatusQuery } from '../hooks/use-kyc-status-query'
import { useKycStore } from '../hooks/use-kyc-store'
import { useOnboardingMutation } from '../hooks/use-onboarding-mutation'
import { usePaymentsStore } from '../hooks/use-payments-store'
import { useQuoteMutation } from '../hooks/use-quote-mutation'

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
  destinations: TChatDestination[]
  payments: TPaymentItem[]
  messages: TChatMessage[]
  onPaymentCompleted?: (payment: TPayment) => void
}

export const ReviewModal = ({
  open,
  onOpenChange,
  recipientAddress,
  destinations,
  payments,
  messages,
  onPaymentCompleted,
}: TProps) => {
  const { t } = useTranslation('modals', { keyPrefix: 'review' })
  const { t: tCommon } = useTranslation('common')
  const navigate = useNavigate()
  const { token } = usePaymentsStore()
  const account = useKycStore(state => state.accounts[recipientAddress])
  const setAccount = useKycStore(state => state.setAccount)
  const onboardingMutation = useOnboardingMutation()
  const quoteMutation = useQuoteMutation()
  const createPaymentMutation = useCreatePaymentMutation()
  const [payment, setPayment] = useState<TPayment | null>(null)
  const [quoteReady, setQuoteReady] = useState(false)
  const [quote, setQuote] = useState<TQuoteResult | null>(null)
  const [isQuotePending, setIsQuotePending] = useState(false)
  const feePercent = FEE_PERCENTAGE.times(100).toFixed(0)

  const handlePaymentDone = () => {
    if (!payment) return

    onOpenChange(false)
    void navigate({ to: '/payments/$id', params: { id: payment.id } })
  }

  const customerLookupQuery = useCustomerLookupQuery({
    address: recipientAddress,
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
    address: recipientAddress,
    enabled: open && !!account?.customerId,
  })

  const totalAmount = useMemo(
    () =>
      StringHelper.formatAmount(
        payments.reduce(
          (accumulator, item) => accumulator.plus(new BigNumber(item.amount || '0')),
          new BigNumber('0')
        )
      ),
    [payments]
  )

  const recipientAmount = useMemo(
    () =>
      StringHelper.formatAmount(
        new BigNumber(totalAmount).times(
          destinations.reduce((sum, destination) => sum + destination.percentage, 0) / 100
        )
      ),
    [totalAmount, destinations]
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
        address: recipientAddress,
      })
      setQuote(result)
      setQuoteReady(true)
    } catch {
      onOpenChange(false)
      ToastHelper.error(t('paymentError'))
    } finally {
      inFlightRef.current = false
      setIsQuotePending(false)
    }
  }, [account?.customerId, recipientAmount, token, recipientAddress, onOpenChange, t])

  const { remainingSeconds, isExpired } = useCountdown(quote?.expiresAt || null)

  const kycStatusForEffect = kycQuery.data?.status
  const hasQuote = !!quote
  const isQuoteError = quoteMutation.isError

  useEffect(() => {
    if (!open || !account?.customerId || kycStatusForEffect !== 'APPROVED') return
    if (hasQuote && !isExpired) return
    if (isQuoteError) return

    void fetchQuote()
  }, [open, account?.customerId, kycStatusForEffect, hasQuote, isExpired, isQuoteError, fetchQuote])

  const createPaymentResetRef = useRef(createPaymentMutation.reset)
  createPaymentResetRef.current = createPaymentMutation.reset

  useEffect(() => {
    if (!open) {
      inFlightRef.current = false
      setQuote(null)
      setQuoteReady(false)
      setIsQuotePending(false)
      quoteResetRef.current()
      createPaymentResetRef.current()
      setPayment(null)
    }
  }, [open])

  const startOnboarding = () => {
    onboardingMutation.mutate(
      { address: recipientAddress },
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

    const destinationPayloads = destinations.map(chatDestination => ({
      id: chatDestination.destination.id,
      name: chatDestination.destination.name,
      token: chatDestination.destination.token,
      pixKey: chatDestination.destination.pixKey,
      pixKeyType: chatDestination.destination.pixKeyType,
      percentage: chatDestination.percentage,
      amount: StringHelper.formatAmount(
        new BigNumber(totalAmount).times(chatDestination.percentage / 100)
      ),
    }))

    createPaymentMutation.mutate(
      {
        quoteId: quote.quoteId,
        customerId: account.customerId,
        bankAccountId: account.bankAccountId,
        address: recipientAddress,
        token,
        amount: recipientAmount,
        feeAmount: quote.feeAmount,
        feePercentage: FEE_PERCENTAGE.times(100).toString(),
        exchangeRate: quote.exchangeRate,
        tokenAmount: quote.destinationAmount,
        destinations: destinationPayloads,
        items: payments.map(item => ({ amount: item.amount, description: item.description })),
        messages: messages.map(message => ({ role: message.role, text: message.text })),
      },
      {
        onSuccess: payment => {
          setPayment(payment)
          onPaymentCompleted?.(payment)
          ToastHelper.success(t('orderCreated'))
        },
        onError: () => {
          ToastHelper.error(t('paymentError'))
        },
      }
    )
  }

  const kycStatus: TKycStatus = kycQuery.data?.status || 'NOT_STARTED'
  const isReadyForQuote = !!account?.customerId && kycStatus === 'APPROVED'

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
      .with({ kycStatus: 'NOT_STARTED' }, { kycStatus: 'PENDING' }, () => (
        <div className="rounded-xl border border-info-500/30 bg-info-100 px-4 py-3 text-xs text-neutral-700">
          {t('kycPending')}
        </div>
      ))
      .with({ kycStatus: 'REJECTED' }, () => (
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
      isCloseDisabled={createPaymentMutation.isPending}
      preventClose
    >
      {payment?.pix ? (
        <PixContent
          pix={payment.pix}
          paymentId={payment.id}
          isPendingOrder={false}
          onPaid={handlePaymentDone}
        />
      ) : (
        <div className="space-y-4">
          {renderHeaderState()}

          <div className="flex items-start gap-2 text-xs rounded-xl border border-info-500/30 bg-info-100 px-3 py-2 text-neutral-700">
            <InfoIcon className="size-4 shrink-0 text-info-500 mt-0.5" aria-hidden="true" />
            <p>{t('reviewWarning')}</p>
          </div>

          <section aria-label={t('summaryTitle')} className="space-y-2">
            <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              {t('summaryTitle')}
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
                <tbody className="text-xs divide-y divide-neutral-200">
                  {destinations.map(chatDestination => {
                    const destinationAmount = StringHelper.formatAmount(
                      new BigNumber(totalAmount).times(chatDestination.percentage / 100)
                    )

                    return (
                      <tr key={chatDestination.destination.id}>
                        <td className="px-4 py-2 text-neutral-900">
                          {chatDestination.destination.name}
                        </td>
                        <td className="px-4 py-2 text-right text-neutral-900">
                          {chatDestination.percentage}%
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-neutral-900 whitespace-nowrap">
                          {StringHelper.formatCurrencyAmount(destinationAmount, token)}
                        </td>
                      </tr>
                    )
                  })}
                  <tr>
                    <td className="px-4 py-2 text-neutral-500">
                      <div className="flex items-center gap-1">
                        {t('feeLabel')}
                        <FeeIcon label={t('feeTooltip', { fee: feePercent })} />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right text-neutral-500">{feePercent}%</td>
                    <td className="px-4 py-2 text-right text-neutral-900 whitespace-nowrap">
                      {!quoteReady ? (
                        <Skeleton className="h-3 w-20 ml-auto" />
                      ) : (
                        StringHelper.formatCurrencyAmount(feeAmount, token)
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="px-4 py-2 font-bold text-neutral-900">
                      {t('total')}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-neutral-900 whitespace-nowrap">
                      {!quoteReady ? (
                        <Skeleton className="h-3 w-24 ml-auto" />
                      ) : (
                        StringHelper.formatCurrencyAmount(totalToPay, token)
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <Accordion value="fees" trigger={<span>{t('technicalDetailsTitle')}</span>}>
            <dl className="text-xs text-neutral-700">
              <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100">
                <dt className="text-neutral-500">{t('coinLabel')}</dt>
                <dd className="flex items-center gap-1">
                  <TokenIcon token={token} className="size-4 object-cover" />
                  <span className="font-medium">
                    {StringHelper.formatAmount(quote?.destinationAmount || '0')} {token}
                  </span>
                </dd>
              </div>
              {isReadyForQuote && (
                <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
                  <dt className="text-neutral-500">{t('rate')}</dt>
                  <dd>
                    {!quoteReady ? (
                      <Skeleton />
                    ) : (
                      tCommon('rateValue', {
                        fiat: tCommon(`fiatBySymbol.${FIAT_BY_TOKEN[token]}`).toLowerCase(),
                        rate: StringHelper.formatAmount(quote?.exchangeRate || '0'),
                        token,
                      })
                    )}
                  </dd>
                </div>
              )}
              {recipientAddress && (
                <div className="flex items-center justify-between pt-1.5">
                  <dt className="text-neutral-500">{t('address')}</dt>
                  <TruncatedAddress address={recipientAddress} />
                </div>
              )}
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
              .with({ kycStatus: 'NOT_STARTED' }, () => (
                <Button variant="outline" onClick={continueKyc}>
                  {t('continueKyc')}
                </Button>
              ))
              .with({ kycStatus: 'PENDING' }, () => (
                <Button variant="outline" onClick={continueKyc}>
                  {t('continueKyc')}
                </Button>
              ))
              .with({ kycStatus: 'REJECTED' }, () => (
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
                    createPaymentMutation.isPending ||
                    !account?.bankAccountId
                  }
                  onClick={confirm}
                >
                  {createPaymentMutation.isPending ? t('confirming') : t('confirm')}
                </Button>
              ))
              .otherwise(() => null)}
          </div>
        </div>
      )}
    </Modal>
  )
}

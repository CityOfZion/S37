import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCode } from 'react-qr-code'

import type { TPaymentPix, TPaymentStatus } from 'fractapay-shared'
import { StringHelper, TOKEN } from 'fractapay-shared'

import { ToastHelper } from '../helpers/ToastHelper'
import { usePaymentQuery } from '../hooks/use-payment-query'
import { usePaymentSimulateMutation } from '../hooks/use-simulate-fiat-mutation'
import { Button } from './Button'
import { Tooltip } from './Tooltip'

import ClipboardIcon from '../assets/icons/clipboard-icon.svg?react'
import WarningIcon from '../assets/icons/warning-icon.svg?react'

const PAID_STATUSES = new Set<TPaymentStatus>(['FUNDED', 'COMPLETED'])

type TProps = {
  pix: TPaymentPix
  paymentId?: string
  isPendingOrder?: boolean
  hideRedirectMessage?: boolean
  onPaid?: () => void
}

export const PixContent = ({
  pix,
  paymentId,
  isPendingOrder,
  hideRedirectMessage,
  onPaid,
}: TProps) => {
  const { t } = useTranslation('components', { keyPrefix: 'pix' })
  const simulateMutation = usePaymentSimulateMutation()
  const paidRef = useRef(false)

  const { data: paymentData } = usePaymentQuery(paymentId ?? '')

  useEffect(() => {
    if (!paymentData || paidRef.current || !onPaid) return

    if (PAID_STATUSES.has(paymentData.status)) {
      paidRef.current = true
      onPaid()
    }
  }, [paymentData?.status, onPaid, paymentData])

  const pixCodeRef = useRef<HTMLDivElement>(null)

  const selectAll = () => {
    const element = pixCodeRef.current
    if (!element) return
    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(element)
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(pix.pixCode)
      ToastHelper.success(t('copied'))
    } catch {
      ToastHelper.error(t('copyError'))
    }
  }

  const simulate = () => {
    if (!paymentId) return

    simulateMutation.mutate(paymentId, {
      onSuccess: () => {
        ToastHelper.success(t('simulateSuccess'))
      },
      onError: () => ToastHelper.error(t('simulateError')),
    })
  }

  const currentStatus = paymentData?.status

  return (
    <div className="space-y-4 mt-8">
      {isPendingOrder && (
        <div className="flex items-start gap-2 text-xs rounded-xl border border-warning-500/30 bg-warning-100 px-3 py-2 text-neutral-700">
          <WarningIcon className="size-4 shrink-0 text-warning-500 mt-0.5" aria-hidden="true" />
          <p>{t('pendingOrder')}</p>
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <div className="rounded-xl bg-white p-3">
          <QRCode value={pix.pixCode} size={180} level="M" aria-label={t('qrLabel')} />
        </div>

        <p className="text-lg text-neutral-500 text-center">
          {t('amount')}:{' '}
          <strong className="text-neutral-900">
            {StringHelper.formatCurrencyAmount(pix.amount, TOKEN.TESOURO)}
          </strong>
        </p>
      </div>

      {!hideRedirectMessage && (
        <p className="text-xs max-w-86 mx-auto text-info-500 font-semibold text-center">
          {t('waitForRedirect')}
        </p>
      )}

      <div className="space-y-2">
        <label
          htmlFor="pix-code"
          className="text-xs font-semibold text-neutral-500 uppercase tracking-wider"
        >
          {t('code')}
        </label>

        <div className="flex flex-col sm:flex-row sm:items-stretch gap-2">
          <div
            ref={pixCodeRef}
            id="pix-code"
            className="w-full rounded-xl border border-neutral-200 bg-white p-3 text-xs font-mono text-neutral-900 break-all cursor-pointer"
            onClick={selectAll}
          >
            {pix.pixCode}
          </div>

          <Tooltip content={t('copy')} className="hidden sm:block">
            <Button
              aria-label={t('copy')}
              variant="outline"
              size="sm"
              onClick={copyCode}
              className="w-full gap-2 sm:w-auto sm:flex-col sm:gap-1 sm:px-3"
            >
              <span className="text-xs sm:hidden">{t('copy')}</span>
              <ClipboardIcon className="size-4 sm:size-5" aria-hidden="true" />
            </Button>
          </Tooltip>
        </div>
      </div>

      {paymentId && (!currentStatus || !PAID_STATUSES.has(currentStatus)) && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={simulateMutation.isPending}
            onClick={simulate}
          >
            {simulateMutation.isPending ? t('simulating') : t('simulate')}
          </Button>
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCode } from 'react-qr-code'

import type { TPixInstructions } from 'fractapay-shared'
import { StringHelper, TOKEN } from 'fractapay-shared'

import { ToastHelper } from '../helpers/ToastHelper'
import { useOrderQuery } from '../hooks/use-order-query'
import { useSimulateFiatMutation } from '../hooks/use-simulate-fiat-mutation'
import { Button } from './Button'
import { Tooltip } from './Tooltip'

import ClipboardIcon from '../assets/icons/clipboard-icon.svg?react'
import WarningIcon from '../assets/icons/warning-icon.svg?react'

const PAID_STATUSES = new Set(['funded', 'completed'])

type TProps = {
  pix: TPixInstructions
  orderId?: string
  isPendingOrder?: boolean
  hideRedirectMessage?: boolean
  onPaid?: () => void
}

export const PixInstructions = ({ pix, orderId, isPendingOrder, hideRedirectMessage, onPaid }: TProps) => {
  const { t } = useTranslation('components', { keyPrefix: 'pix' })
  const simulateMutation = useSimulateFiatMutation()
  const paidRef = useRef(false)

  const { data: order } = useOrderQuery(orderId ?? '')

  useEffect(() => {
    if (!order || paidRef.current || !onPaid) return
    if (PAID_STATUSES.has(order.status)) {
      paidRef.current = true
      onPaid()
    }
  }, [order, onPaid])

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(pix.pixCode)
      ToastHelper.success(t('copied'))
    } catch {
      ToastHelper.error(t('copyError'))
    }
  }

  const simulate = () => {
    if (!orderId) return

    simulateMutation.mutate(orderId, {
      onSuccess: () => {
        ToastHelper.success(t('simulateSuccess'))
      },
      onError: () => ToastHelper.error(t('simulateError')),
    })
  }

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

        <div className="flex items-stretch gap-2">
          <div
            id="pix-code"
            className="w-full rounded-xl border border-neutral-200 bg-white p-3 text-xs font-mono text-neutral-900 resize-none break-all"
          >
            {pix.pixCode}
          </div>

          <Tooltip content={t('copy')}>
            <Button aria-label={t('copy')} variant="outline" size="sm" onClick={copyCode}>
              <ClipboardIcon className="size-5" aria-hidden="true" />
            </Button>
          </Tooltip>
        </div>
      </div>

      {orderId && !PAID_STATUSES.has(order?.status ?? '') && (
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

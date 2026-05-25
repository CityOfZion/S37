import { useTranslation } from 'react-i18next'
import { QRCode } from 'react-qr-code'

import type { TPixInstructions } from 'fractapay-shared'
import { StringHelper } from 'fractapay-shared'

import { ToastHelper } from '../helpers/ToastHelper'
import { useSimulateFiatMutation } from '../hooks/use-simulate-fiat-mutation'
import { Button } from './Button'
import { Tooltip } from './Tooltip'

import ClipboardIcon from '../assets/icons/clipboard-icon.svg?react'

type TProps = {
  pix: TPixInstructions
  orderId?: string
  onSimulated?: () => void
}

export const PixInstructions = ({ pix, orderId, onSimulated }: TProps) => {
  const { t } = useTranslation('components', { keyPrefix: 'pix' })
  const simulateMutation = useSimulateFiatMutation()

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
        onSimulated?.()
      },
      onError: () => ToastHelper.error(t('simulateError')),
    })
  }

  return (
    <div className="space-y-4 mt-8">
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-xl bg-white p-3">
          <QRCode value={pix.pixCode} size={180} level="M" aria-label={t('qrLabel')} />
        </div>

        <p className="text-lg text-neutral-500 text-center">
          {t('amount')}:{' '}
          <strong className="text-neutral-900">
            {StringHelper.formatCurrencyAmount(pix.amount, 'TESOURO')}
          </strong>
        </p>
      </div>

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

      {orderId && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="max-sm:w-full"
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

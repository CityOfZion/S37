import { useTranslation } from 'react-i18next'
import { QRCode } from 'react-qr-code'

import type { TPixInstructions } from 'fractapay-shared'
import { StringHelper } from 'fractapay-shared'

import { ToastHelper } from '../helpers/ToastHelper'
import { useSimulateFiatMutation } from '../hooks/use-simulate-fiat-mutation'
import { Button } from './Button'

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
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-xl bg-white p-3">
          <QRCode value={pix.pixCode} size={180} level="M" aria-label={t('qrLabel')} />
        </div>

        <p className="text-sm text-gray-300 text-center">
          {t('amount')}:{' '}
          <strong className="text-white">
            {StringHelper.formatCurrencyAmount(pix.amount, 'TESOURO')}
          </strong>
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="pix-code" className="text-xs font-medium text-gray-400 uppercase">
          {t('code')}
        </label>

        <div className="flex items-stretch gap-2">
          <textarea
            id="pix-code"
            readOnly
            value={pix.pixCode}
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-gray-950 p-3 text-xs font-mono text-white outline-none resize-none break-all"
          />

          <Button aria-label={t('copy')} variant="outline" size="sm" onClick={copyCode}>
            <ClipboardIcon className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {pix.beneficiary && (
        <p className="text-xs text-gray-400">
          {t('beneficiary')}: <span className="text-white">{pix.beneficiary}</span>
        </p>
      )}

      {orderId && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
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

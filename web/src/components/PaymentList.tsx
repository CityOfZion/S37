import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { TPayment } from 'fractapay-shared'

import { Button } from './Button'

import CheckIcon from '../assets/icons/check-icon.svg?react'
import ClipboardIcon from '../assets/icons/clipboard-icon.svg?react'
import EmptyStateIcon from '../assets/icons/empty-state-icon.svg?react'
import ExecuteIcon from '../assets/icons/execute-icon.svg?react'

type TPaymentListProps = {
  payments: TPayment[]
}

export const PaymentList = ({ payments }: TPaymentListProps) => {
  const { t } = useTranslation()
  const [copied, setCopied] = useState<string | null>(null)

  const total = payments.reduce((sum, payment) => sum + payment.amount, 0)

  const copyAddress = async (address: string) => {
    await navigator.clipboard.writeText(address)
    setCopied(address)
    setTimeout(() => setCopied(null), 2000)
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <EmptyStateIcon className="size-12 mx-auto mb-4 opacity-30" aria-hidden="true" />
        <p>{t('payments.empty')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold text-lg">{t('payments.title')}</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            {t('payments.count', { count: payments.length })}
          </span>
          <span className="text-sm font-medium text-primary">
            {t('payments.total')}: {total.toLocaleString()} XLM
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                {t('payments.address')}
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                {t('payments.amount')}
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">
                {t('payments.description')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {payments.map((payment, index) => (
              <tr key={index} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-gray-300 truncate max-w-50">
                      {payment.address}
                    </span>
                    <Button
                      variant="ghost"
                      onClick={() => void copyAddress(payment.address)}
                      className="shrink-0"
                      title={t('payments.copy')}
                    >
                      {copied === payment.address ? (
                        <CheckIcon className="size-4 text-green-400" aria-hidden="true" />
                      ) : (
                        <ClipboardIcon className="size-4" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold text-white">
                    {payment.amount.toLocaleString()}
                  </span>
                  <span className="text-gray-500 text-sm ml-1">XLM</span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-sm hidden md:table-cell">
                  {payment.description ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-white/5 border-t border-white/10">
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-400">{t('payments.total')}</td>
              <td className="px-4 py-3 text-right font-bold text-white">
                {total.toLocaleString()} <span className="text-primary">XLM</span>
              </td>
              <td className="hidden md:table-cell" />
            </tr>
          </tfoot>
        </table>
      </div>

      <Button className="w-full">
        <ExecuteIcon className="size-5" aria-hidden="true" />

        {t('payments.execute')}
      </Button>
    </div>
  )
}

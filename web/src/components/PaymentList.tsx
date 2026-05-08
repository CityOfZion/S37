import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { twMerge } from 'tailwind-merge'

import type { TPayment } from 'fractapay-shared'

type TPaymentListProps = {
  payments: TPayment[]
}

export function PaymentList({ payments }: TPaymentListProps) {
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
        <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 48 48">
          <path d="M24 4L4 16V32L24 44L44 32V16L24 4Z" stroke="currentColor" strokeWidth="2"/>
          <path d="M24 4V44M4 16L44 16M4 32L44 32" stroke="currentColor" strokeWidth="2"/>
        </svg>
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
                    <span className="font-mono text-sm text-gray-300 truncate max-w-[200px]">
                      {payment.address}
                    </span>
                    <button
                      onClick={() => void copyAddress(payment.address)}
                      className="text-gray-500 hover:text-primary transition-colors shrink-0"
                      title={t('payments.copy')}
                    >
                      {copied === payment.address ? (
                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 16 16">
                          <path d="M3 8L6.5 11.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                          <rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M11 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v7a1 1 0 001 1h2" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold text-white">{payment.amount.toLocaleString()}</span>
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

      <button
        className={twMerge(
          'w-full py-3 rounded-xl font-semibold text-white transition-all',
          'bg-primary hover:bg-primary-600 shadow-lg shadow-primary/20',
          'flex items-center justify-center gap-2'
        )}
      >
        <svg className="size-5" fill="none" viewBox="0 0 20 20">
          <path d="M10 2L2 10H6V18H14V10H18L10 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        </svg>

        {t('payments.execute')}
      </button>
    </div>
  )
}

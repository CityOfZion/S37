import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useNavigate, useSearch } from '@tanstack/react-router'

import { Button } from '../components/Button'
import { useKycStatusQuery } from '../hooks/use-kyc-status-query'

export const KycPage = () => {
  const { t } = useTranslation('components', { keyPrefix: 'kyc' })
  const navigate = useNavigate()
  const { customerId, publicKey, presignedUrl } = useSearch({ from: '/kyc' })
  const { data, isError } = useKycStatusQuery({ customerId, publicKey })

  const status = data?.status

  useEffect(() => {
    if (status === 'approved') {
      void navigate({ to: '/' })
    }
  }, [status, navigate])

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-white font-semibold text-2xl">{t('title')}</h2>
        <Button variant="outline" onClick={() => void navigate({ to: '/' })}>
          {t('back')}
        </Button>
      </div>

      <p className="text-gray-400 text-sm">{t('description')}</p>

      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
      >
        {t(`status.${status || 'not_started'}`)}
        {isError && <span className="text-red-400 ml-2">{t('error')}</span>}
      </div>

      <iframe
        title={t('iframeTitle')}
        src={presignedUrl}
        className="w-full h-[720px] rounded-2xl border border-white/10 bg-white"
        allow="camera; microphone; clipboard-read; clipboard-write"
      />
    </main>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Provider as TooltipProvider } from '@radix-ui/react-tooltip'
import { Toaster } from 'sonner'

import type { TPayment } from 'fractapay-shared'

import { FileUpload } from './components/FileUpload'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { PaymentsList } from './components/PaymentsList'
import { ToastHelper } from './helpers/ToastHelper'

export const App = () => {
  const { t } = useTranslation('common', { keyPrefix: 'app' })

  const [payments, setPayments] = useState<TPayment[]>([])

  const handlePaymentsExtracted = (extracted: TPayment[]) => {
    setPayments(extracted)

    ToastHelper.success(t('uploadSuccess'), t('paymentsCount', { count: extracted.length }))
  }

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <Toaster theme="dark" richColors position="top-right" />

      <div className="min-h-screen bg-gray-950 text-white">
        <Header />

        <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              {t('hackathon')}
            </div>

            <h2 className="text-4xl font-bold bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent">
              {t('subtitle')}
            </h2>

            <p className="text-gray-400 max-w-lg mx-auto">{t('tagline')}</p>
          </div>

          <FileUpload onPaymentsExtracted={handlePaymentsExtracted} />

          <PaymentsList payments={payments} onPaymentsChange={setPayments} />
        </main>

        <Footer />
      </div>
    </TooltipProvider>
  )
}

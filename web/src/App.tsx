import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { toast, Toaster } from 'sonner'

import type { TPayment } from 'fractapay-shared'

import { FileUpload } from './components/FileUpload'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { PaymentList } from './components/PaymentList'

export const App = () => {
  const { t } = useTranslation()
  const [payments, setPayments] = useState<TPayment[]>([])

  const handlePaymentsExtracted = (extracted: TPayment[]) => {
    setPayments(extracted)

    toast.success(t('upload.success'), {
      description: t('payments.count', { count: extracted.length }),
    })
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Toaster theme="dark" richColors position="top-right" />

      <Header />

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            Stellar 37°
          </div>

          <h2 className="text-4xl font-bold bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent">
            {t('app.subtitle')}
          </h2>

          <p className="text-gray-400 max-w-lg mx-auto">{t('app.tagline')}</p>
        </div>

        <FileUpload onPaymentsExtracted={handlePaymentsExtracted} />

        <PaymentList payments={payments} />
      </main>

      <Footer />
    </div>
  )
}

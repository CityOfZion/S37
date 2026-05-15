import { useTranslation } from 'react-i18next'

import { FileUpload } from '../components/FileUpload'
import { PaymentsList } from '../components/PaymentsList'

export const HomePage = () => {
  const { t } = useTranslation('common', { keyPrefix: 'app' })

  return (
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

      <FileUpload />

      <PaymentsList />
    </main>
  )
}

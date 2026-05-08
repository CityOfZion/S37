import { useTranslation } from 'react-i18next'

import { APP_NAME, LANGUAGE_NAMES } from '../constants'
import type { TLanguage } from '../types'
import { Button } from './Button'

export const Header = () => {
  const { i18n } = useTranslation()

  const toggleLanguage = () => {
    const next: TLanguage = i18n.language === 'en-US' ? 'pt-BR' : 'en-US'

    void i18n.changeLanguage(next)
  }

  return (
    <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt={APP_NAME} className="w-9 h-9 rounded-xl object-contain" />
          <div>
            <h1 className="text-white font-bold text-lg leading-none">{APP_NAME}</h1>
            <p className="text-gray-500 text-xs">Powered by Stellar</p>
          </div>
        </div>

        <Button variant="outline" size="xs" onClick={toggleLanguage}>
          {i18n.language === 'en-US'
            ? `🇧🇷 ${LANGUAGE_NAMES['pt-BR']}`
            : `🇺🇸 ${LANGUAGE_NAMES['en-US']}`}
        </Button>
      </div>
    </header>
  )
}

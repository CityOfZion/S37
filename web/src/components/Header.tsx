import { useTranslation } from 'react-i18next'

import { APP_NAME, LANGUAGE_NAMES } from '../constants'
import { StringHelper } from '../helpers/StringHelper'
import type { TLanguage } from '../types'
import { Button } from './Button'

const PUBLIC_KEY = import.meta.env.VITE_PUBLIC_KEY

export const Header = () => {
  const { t, i18n } = useTranslation()

  const isEnUs = i18n.language === 'en-US'

  const toggleLanguage = () => {
    const next: TLanguage = isEnUs ? 'pt-BR' : 'en-US'

    void i18n.changeLanguage(next)
  }

  return (
    <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt={APP_NAME} className="size-9 rounded-xl object-contain" />
          <div className="flex gap-1 flex-col">
            <h1 className="text-white font-bold text-lg leading-none">{APP_NAME}</h1>
            <p className="text-gray-500 text-xs leading-2">{t('app.poweredBy')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {PUBLIC_KEY && (
            <p className="font-mono text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
              {StringHelper.truncateMiddle(PUBLIC_KEY, 10)}
            </p>
          )}

          <Button
            aria-label={t('header.switchLanguage')}
            variant="outline"
            size="xs"
            className="min-w-26 max-w-26 w-26"
            onClick={toggleLanguage}
          >
            {isEnUs ? `🇺🇸 ${LANGUAGE_NAMES['en-US']}` : `🇧🇷 ${LANGUAGE_NAMES['pt-BR']}`}
          </Button>
        </div>
      </div>
    </header>
  )
}

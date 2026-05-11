import { useTranslation } from 'react-i18next'

import { APP_NAME, LANGUAGE_NAMES } from '../constants'
import type { TLanguage } from '../types'
import { Button } from './Button'

const LINKEDIN_URL = 'https://www.linkedin.com/company/fractapay'

export const Footer = () => {
  const { t, i18n } = useTranslation()

  const isEnUs = i18n.language === 'en-US'

  const toggleLanguage = () => {
    const next: TLanguage = isEnUs ? 'pt-BR' : 'en-US'

    void i18n.changeLanguage(next)
  }

  return (
    <footer className="border-t border-white/10 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-gray-500 text-sm text-center sm:text-left">
          {t('footer.builtFor')} · © {new Date().getFullYear()} {APP_NAME}
        </p>

        <div className="flex items-center gap-4">
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white focus:text-white transition-colors text-sm"
          >
            {t('footer.linkedin')}
          </a>

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
    </footer>
  )
}

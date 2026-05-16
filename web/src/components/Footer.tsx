import { useTranslation } from 'react-i18next'

import type { TLanguage } from 'fractapay-shared'

import { APP_NAME, LANGUAGE_NAMES } from '../constants'
import { useLanguageStore } from '../hooks/use-language-store'
import { Button } from './Button'
import { Tooltip } from './Tooltip'

const LINKEDIN_URL = 'https://www.linkedin.com/company/fractapay'

export const Footer = () => {
  const { t } = useTranslation('components', { keyPrefix: 'footer' })
  const {language, setLanguage} = useLanguageStore()

  const isEnUs = language === 'en-US'

  const toggleLanguage = () => {
    const next: TLanguage = isEnUs ? 'pt-BR' : 'en-US'

    setLanguage(next)
  }

  return (
    <footer className="border-t border-white/10 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-gray-500 text-sm text-center sm:text-left">
          {t('builtFor')} · © {new Date().getFullYear()} {APP_NAME}
        </p>

        <div className="flex items-center gap-4">
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white focus:text-white transition-colors text-sm"
          >
            {t('linkedin')}
          </a>

          <Tooltip content={t('switchLanguage')}>
            <Button
              aria-label={t('switchLanguage')}
              variant="outline"
              size="xs"
              className="min-w-26 max-w-26 w-26"
              onClick={toggleLanguage}
            >
              {isEnUs ? `🇺🇸 ${LANGUAGE_NAMES['en-US']}` : `🇧🇷 ${LANGUAGE_NAMES['pt-BR']}`}
            </Button>
          </Tooltip>
        </div>
      </div>
    </footer>
  )
}

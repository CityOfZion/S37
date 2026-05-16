import { initReactI18next } from 'react-i18next'

import i18n from 'i18next'

import { TLanguage } from 'fractapay-shared'

import { enUsResources } from '../locales/en-US'
import { ptBrResources } from '../locales/pt-BR'

const detectLanguage = (): TLanguage => {
  const browserLanguage = navigator.language.toLowerCase()

  if (browserLanguage.startsWith('pt')) return 'pt-BR'

  return 'en-US'
}

void i18n.use(initReactI18next).init({
  resources: {
    'en-US': enUsResources,
    'pt-BR': ptBrResources,
  },
  defaultNS: 'common',
  lng: detectLanguage(),
  fallbackLng: 'en-US',
  interpolation: { escapeValue: false },
})

export default i18n

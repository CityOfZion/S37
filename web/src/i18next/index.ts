import { initReactI18next } from 'react-i18next'

import i18n from 'i18next'

import { enUsResources } from '../locales/en-US'
import { ptBrResources } from '../locales/pt-BR'
import { TLanguage } from '../types'

const defaultLang: TLanguage = 'en-US'

const detectLanguage = (): TLanguage => {
  const browserLang = navigator.language.toLowerCase()

  if (browserLang.startsWith('pt')) return 'pt-BR'
  if (browserLang.startsWith('en')) return defaultLang

  return defaultLang
}

void i18n.use(initReactI18next).init({
  resources: {
    [defaultLang]: enUsResources,
    'pt-BR': ptBrResources,
  },
  defaultNS: 'common',
  lng: detectLanguage(),
  fallbackLng: defaultLang,
  interpolation: { escapeValue: false },
})

export default i18n

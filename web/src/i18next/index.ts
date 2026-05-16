import { initReactI18next } from 'react-i18next'

import i18n from 'i18next'

import { useLanguageStore } from '../hooks/use-language-store'
import { enUsResources } from '../locales/en-US'
import { ptBrResources } from '../locales/pt-BR'

void i18n.use(initReactI18next).init({
  resources: {
    'en-US': enUsResources,
    'pt-BR': ptBrResources,
  },
  defaultNS: 'common',
  lng: useLanguageStore.getState().language,
  fallbackLng: 'en-US',
  interpolation: { escapeValue: false },
})

useLanguageStore.subscribe(state => {
  if (state.language !== i18n.language) {
    void i18n.changeLanguage(state.language)
  }
})

i18n.on('languageChanged', language => {
  if (language !== useLanguageStore.getState().language) {
    useLanguageStore.getState().setLanguage(language as never)
  }
})

export default i18n

import i18next from 'i18next'

import { DEFAULT_LANGUAGE } from 'fractapay-shared'

import { enUsResources } from '../locales/en-US'
import { ptBrResources } from '../locales/pt-BR'

void i18next.init({
  resources: {
    'en-US': enUsResources,
    'pt-BR': ptBrResources,
  },
  defaultNS: 'email',
  fallbackLng: DEFAULT_LANGUAGE,
  // Interpolated values are inserted into both plaintext and HTML email bodies;
  // matches the web instance. Pass `lng` per `t()` call so requests stay isolated.
  interpolation: { escapeValue: false },
})

export default i18next

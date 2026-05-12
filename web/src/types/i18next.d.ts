import type enUS from '../locales/en-US.json'

import 'i18next'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: typeof enUS
  }
}

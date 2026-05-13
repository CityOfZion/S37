import type { enUsResources } from '../locales/en-US'

import 'i18next'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: typeof enUsResources
  }
}

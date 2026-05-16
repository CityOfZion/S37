import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { SUPPORTED_LANGUAGES, type TLanguage } from 'fractapay-shared'

const detectBrowserLanguage = (): TLanguage => {
  const browserLanguage = navigator.language.toLowerCase()

  if (browserLanguage.startsWith('pt')) return 'pt-BR'

  return 'en-US'
}

type TLanguageStore = {
  language: TLanguage
  setLanguage: (language: TLanguage) => void
}

export const useLanguageStore = create<TLanguageStore>()(
  persist(
    set => ({
      language: detectBrowserLanguage(),
      setLanguage: language => {
        if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(language)) return

        set({ language })
      },
    }),
    { name: 'fractapay.language' }
  )
)

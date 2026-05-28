import { create } from 'zustand'

import type { TToken } from 'fractapay-shared'
import { TOKEN } from 'fractapay-shared'

type TDataStore = {
  token: TToken
  setToken: (token: TToken) => void
  address: string
  setAddress: (address: string) => void
}

export const useDataStore = create<TDataStore>(set => ({
  token: TOKEN.TESOURO,
  setToken: token => set({ token }),
  address: '',
  setAddress: address => set({ address }),
}))

import { create } from 'zustand'

import type { TToken } from 'fractapay-shared'
import { TOKEN } from 'fractapay-shared'

type TPaymentsStore = {
  token: TToken
  setToken: (token: TToken) => void
  address: string
  setAddress: (address: string) => void
}

export const usePaymentsStore = create<TPaymentsStore>(set => ({
  token: TOKEN.TESOURO,
  setToken: token => set({ token }),
  address: 'GBEYN3IHO67REHEXFLOH2PXPDDVRBO22BAYBMUI5ETGWG3VZZQ2PYWWS',
  setAddress: address => set({ address }),
}))

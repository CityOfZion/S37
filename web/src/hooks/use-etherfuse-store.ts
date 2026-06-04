import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TEtherfuseAccount = {
  customerId: string
  bankAccountId: string
  presignedUrl: string
}

type TEtherfuseStore = {
  accounts: Record<string, TEtherfuseAccount>
  setAccount: (address: string, account: TEtherfuseAccount) => void
  updateAccount: (address: string, account: Partial<TEtherfuseAccount>) => void
  removeAccount: (address: string) => void
  reset: () => void
}

export const useEtherfuseStore = create<TEtherfuseStore>()(
  persist(
    set => ({
      accounts: {},
      setAccount: (address, account) =>
        set(state => ({ accounts: { ...state.accounts, [address]: account } })),
      updateAccount: (address, account) =>
        set(state => {
          const existing = state.accounts[address]
          if (!existing) return state

          return { accounts: { ...state.accounts, [address]: { ...existing, ...account } } }
        }),
      removeAccount: address =>
        set(state => {
          const next = { ...state.accounts }
          delete next[address]

          return { accounts: next }
        }),
      reset: () => set({ accounts: {} }),
    }),
    { name: 'fractapay.etherfuse' }
  )
)

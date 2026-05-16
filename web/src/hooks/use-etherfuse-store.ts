import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TEtherfuseAccount = {
  customerId: string
  bankAccountId: string
  presignedUrl: string
}

type TEtherfuseStore = {
  accounts: Record<string, TEtherfuseAccount>
  setAccount: (publicKey: string, account: TEtherfuseAccount) => void
  updateAccount: (publicKey: string, account: Partial<TEtherfuseAccount>) => void
  removeAccount: (publicKey: string) => void
  reset: () => void
}

export const useEtherfuseStore = create<TEtherfuseStore>()(
  persist(
    set => ({
      accounts: {},
      setAccount: (publicKey, account) =>
        set(state => ({ accounts: { ...state.accounts, [publicKey]: account } })),
      updateAccount: (publicKey, account) =>
        set(state => {
          const existing = state.accounts[publicKey]
          if (!existing) return state

          return { accounts: { ...state.accounts, [publicKey]: { ...existing, ...account } } }
        }),
      removeAccount: publicKey =>
        set(state => {
          const next = { ...state.accounts }
          delete next[publicKey]

          return { accounts: next }
        }),
      reset: () => set({ accounts: {} }),
    }),
    { name: 'fractapay.etherfuse' }
  )
)

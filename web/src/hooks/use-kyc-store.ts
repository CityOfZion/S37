import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TKycAccount = {
  customerId: string
  bankAccountId: string
  presignedUrl: string
}

type TKycStore = {
  accounts: Record<string, TKycAccount>
  setAccount: (address: string, account: TKycAccount) => void
  updateAccount: (address: string, account: Partial<TKycAccount>) => void
  reset: () => void
}

export const useKycStore = create<TKycStore>()(
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
      reset: () => set({ accounts: {} }),
    }),
    { name: 'fractapay.kyc' }
  )
)

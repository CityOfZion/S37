import { create } from 'zustand'

import type { TPayment, TToken } from 'fractapay-shared'
import { TOKEN } from 'fractapay-shared'

type TPaymentsStore = {
  token: TToken
  setToken: (token: TToken) => void
  price: string
  setPrice: (price: string) => void
  address: string
  setAddress: (address: string) => void
  payments: TPayment[]
  hasPayments: boolean
  setPayments: (payments: TPayment[]) => void
  addPayment: (payment: TPayment) => void
  updatePayment: (payment: TPayment) => void
  deletePayment: (id: string) => void
  mergePayments: (payments: TPayment[]) => void
}

const filterPayments = (payments: TPayment[]): TPayment[] => {
  const seen = new Set<string>()

  return payments.filter(payment => {
    if (seen.has(payment.id)) return false

    seen.add(payment.id)

    return true
  })
}

export const usePaymentsStore = create<TPaymentsStore>(set => ({
  token: TOKEN.TESOURO,
  setToken: token => set({ token }),
  price: '0',
  setPrice: price => set({ price }),
  address: 'GBEYN3IHO67REHEXFLOH2PXPDDVRBO22BAYBMUI5ETGWG3VZZQ2PYWWS',
  setAddress: address => set({ address }),
  payments: [],
  hasPayments: false,
  setPayments: payments => {
    const filteredPayments = filterPayments(payments)

    set({ payments: filteredPayments, hasPayments: filteredPayments.length > 0 })
  },
  addPayment: payment =>
    set(state => {
      const payments = filterPayments([...state.payments, payment])

      return { payments, hasPayments: payments.length > 0 }
    }),
  updatePayment: payment =>
    set(state => ({
      payments: state.payments.map(existing => (existing.id === payment.id ? payment : existing)),
    })),
  deletePayment: id =>
    set(state => {
      const payments = state.payments.filter(existing => existing.id !== id)

      return { payments, hasPayments: payments.length > 0 }
    }),
  mergePayments: payments =>
    set(state => {
      const filteredPayments = filterPayments([...state.payments, ...payments])

      return { payments: filteredPayments, hasPayments: filteredPayments.length > 0 }
    }),
}))

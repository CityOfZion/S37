import { create } from 'zustand'

import type { TPayment } from 'fractapay-shared'

type TPaymentsStore = {
  payments: TPayment[]
  setPayments: (payments: TPayment[]) => void
  addPayment: (payment: TPayment) => void
  updatePayment: (payment: TPayment) => void
  deletePayment: (id: string) => void
}

export const usePaymentsStore = create<TPaymentsStore>(set => ({
  payments: [],
  setPayments: payments => set({ payments }),
  addPayment: payment => set(state => ({ payments: [...state.payments, payment] })),
  updatePayment: payment =>
    set(state => ({
      payments: state.payments.map(existing => (existing.id === payment.id ? payment : existing)),
    })),
  deletePayment: id =>
    set(state => ({ payments: state.payments.filter(payment => payment.id !== id) })),
}))

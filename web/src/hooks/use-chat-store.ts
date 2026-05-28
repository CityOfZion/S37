import { create } from 'zustand'

import type {
  TChatMessage,
  TDestinationAllocation,
  TPayment,
  TPaymentSummaryItem,
} from 'fractapay-shared'

type TChatStore = {
  messages: TChatMessage[]
  payments: TPayment[]
  price: string
  allocations: TDestinationAllocation[]
  summary: TPaymentSummaryItem[]
  isProcessing: boolean
  draftMessage: string
  addMessage: (message: TChatMessage) => void
  setMessages: (messages: TChatMessage[]) => void
  updateMessage: (id: string, patch: Partial<TChatMessage>) => void
  setPayments: (payments: TPayment[]) => void
  mergePayments: (payments: TPayment[]) => void
  setPrice: (price: string) => void
  setAllocations: (allocations: TDestinationAllocation[]) => void
  setSummary: (summary: TPaymentSummaryItem[]) => void
  setIsProcessing: (value: boolean) => void
  setDraftMessage: (value: string) => void
  reset: () => void
}

const INITIAL_STATE = {
  messages: [],
  payments: [],
  price: '0',
  allocations: [],
  summary: [],
  isProcessing: false,
  draftMessage: '',
}

export const useChatStore = create<TChatStore>(set => ({
  ...INITIAL_STATE,
  addMessage: message => set(state => ({ messages: [...state.messages, message] })),
  setMessages: messages => set({ messages }),
  updateMessage: (id, patch) =>
    set(state => ({
      messages: state.messages.map(message =>
        message.id === id ? { ...message, ...patch } : message
      ),
    })),
  setPayments: payments => set({ payments }),
  mergePayments: payments =>
    set(state => {
      const existingIds = new Set(state.payments.map(payment => payment.id))
      const newPayments = payments.filter(payment => !existingIds.has(payment.id))

      return { payments: [...state.payments, ...newPayments] }
    }),
  setPrice: price => set({ price }),
  setAllocations: allocations => set({ allocations }),
  setSummary: summary => set({ summary }),
  setIsProcessing: value => set({ isProcessing: value }),
  setDraftMessage: value => set({ draftMessage: value }),
  reset: () => set(INITIAL_STATE),
}))

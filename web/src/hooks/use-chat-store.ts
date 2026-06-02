import { create } from 'zustand'

import type {
  TChatDestination,
  TChatMessage,
  TPaymentItem,
  TPaymentSummaryItem,
} from 'fractapay-shared'

type TChatStore = {
  messages: TChatMessage[]
  payments: TPaymentItem[]
  destinations: TChatDestination[]
  summary: TPaymentSummaryItem[]
  isProcessing: boolean
  draftMessage: string
  draftFile: File | null
  addMessage: (message: TChatMessage) => void
  setMessages: (messages: TChatMessage[]) => void
  updateMessage: (id: string, patch: Partial<TChatMessage>) => void
  setPayments: (payments: TPaymentItem[]) => void
  mergePayments: (payments: TPaymentItem[]) => void
  setDestinations: (destinations: TChatDestination[]) => void
  setSummary: (summary: TPaymentSummaryItem[]) => void
  setIsProcessing: (value: boolean) => void
  setDraftMessage: (value: string) => void
  setDraftFile: (file: File | null) => void
  reset: () => void
}

const INITIAL_STATE = {
  messages: [],
  payments: [],
  destinations: [],
  summary: [],
  isProcessing: false,
  draftMessage: '',
  draftFile: null,
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
  setDestinations: destinations => set({ destinations }),
  setSummary: summary => set({ summary }),
  setIsProcessing: value => set({ isProcessing: value }),
  setDraftMessage: value => set({ draftMessage: value }),
  setDraftFile: file => set({ draftFile: file }),
  reset: () => set(INITIAL_STATE),
}))

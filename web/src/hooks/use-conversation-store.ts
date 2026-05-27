import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type {
  TDestinationAllocation,
  TOrderStatus,
  TPayment,
  TPaymentSummaryItem,
} from 'fractapay-shared'

export type TConversation = {
  id: string
  title: string
  payments: TPayment[]
  allocations: TDestinationAllocation[]
  summary: TPaymentSummaryItem[]
  orderId?: string
  orderStatus?: TOrderStatus
  totalAmount?: string
  createdAt: string
  updatedAt: string
}

type TConversationStore = {
  conversations: TConversation[]
  activeConversationId: string | null
  addConversation: (conversation: TConversation) => void
  updateConversation: (id: string, patch: Partial<TConversation>) => void
  setActiveConversation: (id: string | null) => void
  removeConversation: (id: string) => void
}

export const useConversationStore = create<TConversationStore>()(
  persist(
    set => ({
      conversations: [],
      activeConversationId: null,
      addConversation: conversation =>
        set(state => ({ conversations: [conversation, ...state.conversations] })),
      updateConversation: (id, patch) =>
        set(state => ({
          conversations: state.conversations.map(conversation =>
            conversation.id === id
              ? { ...conversation, ...patch, updatedAt: new Date().toISOString() }
              : conversation
          ),
        })),
      setActiveConversation: id => set({ activeConversationId: id }),
      removeConversation: id =>
        set(state => ({
          conversations: state.conversations.filter(conversation => conversation.id !== id),
        })),
    }),
    { name: 'fractapay.conversations' }
  )
)

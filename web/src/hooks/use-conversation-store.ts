import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type {
  TChatMessage,
  TDestinationAllocation,
  TOrderStatus,
  TPayment,
  TPaymentSummaryItem,
} from 'fractapay-shared'

export type TConversation = {
  id: string
  title: string
  messages: TChatMessage[]
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
  lastConversationId: string | null
  addConversation: (conversation: TConversation) => void
  updateConversation: (id: string, patch: Partial<TConversation>) => void
  removeConversation: (id: string) => void
  setLastConversationId: (id: string | null) => void
}

export const useConversationStore = create<TConversationStore>()(
  persist(
    set => ({
      conversations: [],
      lastConversationId: null,
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
      removeConversation: id =>
        set(state => ({
          conversations: state.conversations.filter(conversation => conversation.id !== id),
        })),
      setLastConversationId: id => set({ lastConversationId: id }),
    }),
    { name: 'fractapay.conversations' }
  )
)

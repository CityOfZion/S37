import type { TOrderStatus } from 'fractapay-shared'

export const ORDER_STATUS_CLASSES: Record<TOrderStatus, string> = {
  created: 'bg-blue-100 text-blue-700',
  funded: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-orange-100 text-orange-700',
  canceled: 'bg-neutral-100 text-neutral-600',
}

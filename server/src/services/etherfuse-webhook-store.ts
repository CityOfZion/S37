export type TEtherfuseWebhookEvent =
  | 'bank_account_updated'
  | 'customer_updated'
  | 'order_updated'
  | 'quote_updated'
  | 'swap_updated'
  | 'kyc_updated'

export type TEtherfuseWebhookPayload = {
  event: TEtherfuseWebhookEvent
  data: { id: string; status: string; [key: string]: unknown }
  timestamp: string
}

type TCacheEntry = {
  status: string
  data: Record<string, unknown>
  receivedAt: string
}

const cache = new Map<string, TCacheEntry>()

const keyFor = (event: TEtherfuseWebhookEvent, id: string): string => `${event}:${id}`

export const recordWebhookEvent = (payload: TEtherfuseWebhookPayload): void => {
  cache.set(keyFor(payload.event, payload.data.id), {
    status: payload.data.status,
    data: payload.data,
    receivedAt: payload.timestamp,
  })
}

export const getCachedEvent = (
  event: TEtherfuseWebhookEvent,
  id: string
): TCacheEntry | undefined => cache.get(keyFor(event, id))

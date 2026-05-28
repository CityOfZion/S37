import type { TToken } from 'fractapay-shared'
import { TOKEN } from 'fractapay-shared'

import tesouroIconUrl from '../assets/icons/tesouro-icon.webp'

export const TOKEN_ICON_URL: Partial<Record<TToken, string>> = {
  [TOKEN.TESOURO]: tesouroIconUrl,
}

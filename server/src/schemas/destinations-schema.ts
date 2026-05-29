import { z } from 'zod'

import type { TPixKeyType, TToken } from 'fractapay-shared'
import { PIX_KEY, TOKEN } from 'fractapay-shared'

const tokens = Object.values(TOKEN) as TToken[]
const pixKeys = Object.values(PIX_KEY) as TPixKeyType[]

export const createDestinationsSchema = z.object({
  name: z.string().min(1).max(200),
  token: z.enum(tokens),
  pixKey: z.string().min(1).max(500),
  pixKeyType: z.enum(pixKeys),
})

export const updateDestinationsSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  token: z.enum(tokens).optional(),
  pixKey: z.string().min(1).max(500).optional(),
  pixKeyType: z.enum(pixKeys).optional(),
})

export type TCreateDestinationsBody = z.infer<typeof createDestinationsSchema>
export type TUpdateDestinationsBody = z.infer<typeof updateDestinationsSchema>

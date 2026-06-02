import { z } from 'zod'

import { PIX_KEY_TYPES, TOKENS } from '../constants'

export const createDestinationsSchema = z.object({
  name: z.string().min(1).max(200),
  token: z.enum(TOKENS),
  pixKey: z.string().min(1).max(500),
  pixKeyType: z.enum(PIX_KEY_TYPES),
})

export const updateDestinationsSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  token: z.enum(TOKENS).optional(),
  pixKey: z.string().min(1).max(500).optional(),
  pixKeyType: z.enum(PIX_KEY_TYPES).optional(),
})

export type TCreateDestinationsBody = z.infer<typeof createDestinationsSchema>
export type TUpdateDestinationsBody = z.infer<typeof updateDestinationsSchema>

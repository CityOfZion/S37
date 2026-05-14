import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.string().default('http://localhost:3000'),
  VITE_PUBLIC_KEY: z.string().min(1, 'VITE_PUBLIC_KEY is required'),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success || !parsed.data) {
  throw new Error(`Invalid environment variables: ${JSON.stringify(parsed.error.issues)}`)
}

const data = parsed.data

export class EnvHelper {
  static readonly API_URL = data.VITE_API_URL
  static readonly PUBLIC_KEY = data.VITE_PUBLIC_KEY
}

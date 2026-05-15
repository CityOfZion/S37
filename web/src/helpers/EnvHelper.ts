import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.string().default('http://localhost:3000'),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success || !parsed.data) {
  throw new Error(`Invalid environment variables: ${JSON.stringify(parsed.error.issues)}`)
}

const data = parsed.data

export class EnvHelper {
  static readonly API_URL = data.VITE_API_URL
}

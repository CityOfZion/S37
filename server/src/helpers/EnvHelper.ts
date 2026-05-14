import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  PORT: z.string().default('3000'),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success || !parsed.data) {
  console.error('Invalid environment variables:', parsed.error.issues)
  process.exit(1)
}

const data = parsed.data

export class EnvHelper {
  static readonly PORT = parseInt(data.PORT)
  static readonly ANTHROPIC_API_KEY = data.ANTHROPIC_API_KEY
}

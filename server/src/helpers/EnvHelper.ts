import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  PORT: z.string().default('3000'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  ETHERFUSE_API_KEY: z.string().min(1, 'ETHERFUSE_API_KEY is required'),
  ETHERFUSE_BASE_URL: z.string().url().default('https://api.sand.etherfuse.com'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success || !parsed.data) {
  console.error('Invalid environment variables:', parsed.error.issues)
  process.exit(1)
}

const data = parsed.data

export class EnvHelper {
  static readonly PORT = parseInt(data.PORT)
  static readonly GEMINI_API_KEY = data.GEMINI_API_KEY
  static readonly ETHERFUSE_API_KEY = data.ETHERFUSE_API_KEY
  static readonly ETHERFUSE_BASE_URL = data.ETHERFUSE_BASE_URL
  static readonly CORS_ORIGIN = data.CORS_ORIGIN
}

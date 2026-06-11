import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  PORT: z.string().default('3000'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  ETHERFUSE_API_KEY: z.string().min(1, 'ETHERFUSE_API_KEY is required'),
  ETHERFUSE_BASE_URL: z.url().default('https://api.sand.etherfuse.com'),
  ETHERFUSE_WEBHOOK_SECRET: z.string().min(1, 'ETHERFUSE_WEBHOOK_SECRET is required'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  OAUTH_CALLBACK_URL: z.url().default('http://localhost:3000/auth/google/callback'),
  WEB_BASE_URL: z.url().default('http://localhost:5173'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  ENCRYPTION_SECRET: z.string().min(32, 'ENCRYPTION_SECRET must be at least 32 characters'),
  WEB_LOGIN_SUCCESS_URL: z.url().optional(),
  WEB_LOGIN_FAILURE_URL: z.url().optional(),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  RESEND_EMAIL: z.email(),
  FEE_PAYER_SECRET_KEY: z.string().min(1, 'FEE_PAYER_SECRET_KEY is required'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success || !parsed.data) {
  console.error('Invalid environment variables:', parsed.error.issues)
  process.exit(1)
}

const data = parsed.data

export class EnvHelper {
  static readonly PORT = parseInt(data.PORT)
  static readonly CORS_ORIGIN = data.CORS_ORIGIN
  static readonly GEMINI_API_KEY = data.GEMINI_API_KEY
  static readonly ETHERFUSE_API_KEY = data.ETHERFUSE_API_KEY
  static readonly ETHERFUSE_BASE_URL = data.ETHERFUSE_BASE_URL
  static readonly ETHERFUSE_WEBHOOK_SECRET = data.ETHERFUSE_WEBHOOK_SECRET
  static readonly GOOGLE_CLIENT_ID = data.GOOGLE_CLIENT_ID
  static readonly GOOGLE_CLIENT_SECRET = data.GOOGLE_CLIENT_SECRET
  static readonly OAUTH_CALLBACK_URL = data.OAUTH_CALLBACK_URL
  static readonly WEB_BASE_URL = data.WEB_BASE_URL
  static readonly SESSION_SECRET = data.SESSION_SECRET
  static readonly ENCRYPTION_SECRET = data.ENCRYPTION_SECRET
  static readonly WEB_LOGIN_SUCCESS_URL = data.WEB_LOGIN_SUCCESS_URL || data.WEB_BASE_URL
  static readonly WEB_LOGIN_FAILURE_URL =
    data.WEB_LOGIN_FAILURE_URL || `${data.WEB_BASE_URL}/?login=failed`
  static readonly RESEND_API_KEY = data.RESEND_API_KEY
  static readonly RESEND_EMAIL = data.RESEND_EMAIL
  static readonly FEE_PAYER_SECRET_KEY = data.FEE_PAYER_SECRET_KEY
}

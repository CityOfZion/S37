import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  PORT: z.string().default('3000'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  ETHERFUSE_API_KEY: z.string().min(1, 'ETHERFUSE_API_KEY is required'),
  ETHERFUSE_BASE_URL: z.string().url().default('https://api.sand.etherfuse.com'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  OAUTH_CALLBACK_URL: z.string().url().default('http://localhost:3000/auth/google/callback'),
  WEB_BASE_URL: z.string().url().default('http://localhost:5173'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_COOKIE_NAME: z.string().default('fractapay_session'),
  COOKIE_DOMAIN: z.string().optional(),
  WEB_LOGIN_SUCCESS_URL: z.string().url().optional(),
  WEB_LOGIN_FAILURE_URL: z.string().url().optional(),
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
  static readonly GOOGLE_CLIENT_ID = data.GOOGLE_CLIENT_ID
  static readonly GOOGLE_CLIENT_SECRET = data.GOOGLE_CLIENT_SECRET
  static readonly OAUTH_CALLBACK_URL = data.OAUTH_CALLBACK_URL
  static readonly WEB_BASE_URL = data.WEB_BASE_URL
  static readonly SESSION_SECRET = data.SESSION_SECRET
  static readonly SESSION_COOKIE_NAME = data.SESSION_COOKIE_NAME
  static readonly COOKIE_DOMAIN = data.COOKIE_DOMAIN
  static readonly WEB_LOGIN_SUCCESS_URL = data.WEB_LOGIN_SUCCESS_URL ?? data.WEB_BASE_URL
  static readonly WEB_LOGIN_FAILURE_URL =
    data.WEB_LOGIN_FAILURE_URL ?? `${data.WEB_BASE_URL}/?login=failed`
}

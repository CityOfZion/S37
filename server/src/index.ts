import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import oauth2 from '@fastify/oauth2'
import rateLimit from '@fastify/rate-limit'
import Fastify, { type FastifyRequest } from 'fastify'

import { EErrorCode } from 'fractapay-shared'

import { isProduction, PKCE_COOKIE_NAME, SERVICE_NAME } from './constants'
import { EnvHelper } from './helpers/EnvHelper'
import { authRoute } from './routes/auth-route'
import { balanceRoute } from './routes/balance-route'
import { chatRoute } from './routes/chat-route'
import { customersRoute } from './routes/customers-route'
import { destinationsRoute } from './routes/destinations-route'
import { healthRoute } from './routes/health-route'
import { kycRoute } from './routes/kyc-route'
import { onboardingRoute } from './routes/onboarding-route'
import { paymentsRoute } from './routes/payments-route'
import { quotesRoute } from './routes/quotes-route'
import { webhooksRoute } from './routes/webhooks-route'

const fastify = Fastify({
  // Behind Fly's proxy, so `request.ip` reads the real client from X-Forwarded-For.
  trustProxy: true,
  logger: isProduction
    ? true
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true },
        },
      },
})

async function bootstrap(): Promise<void> {
  await fastify.register(cookie, {
    secret: EnvHelper.SESSION_SECRET,
  })

  await fastify.register(jwt, {
    secret: EnvHelper.SESSION_SECRET,
    sign: {
      algorithm: 'HS256',
      iss: SERVICE_NAME,
    },
    verify: {
      algorithms: ['HS256'],
      allowedIss: SERVICE_NAME,
      clockTolerance: 30,
    },
  })

  await fastify.register(cors, {
    origin: EnvHelper.CORS_ORIGIN.split(',').map(origin => origin.trim()),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
  })

  // CSP off: this server only returns JSON + OAuth redirects, no HTML pages to protect.
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  })

  await fastify.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    // Key on Fly's spoof-proof client IP, not the forgeable X-Forwarded-For (request.ip).
    // Swap this header if you move off Fly (e.g. Cloudflare → 'cf-connecting-ip').
    keyGenerator: (request: FastifyRequest) =>
      (request.headers['fly-client-ip'] as string) ?? request.ip,
    ban: 5,
    exponentialBackoff: true,
    onBanReach: (request: FastifyRequest) =>
      request.log.warn({ ip: request.ip }, '[RateLimit] client banned'),
    errorResponseBuilder: (_request, context) => {
      const body = {
        error: context.ban ? EErrorCode.IP_BANNED : EErrorCode.RATE_LIMITED,
      }

      return body
    },
  })

  await fastify.register(oauth2, {
    name: 'googleOAuth2',
    scope: ['openid', 'email', 'profile'],
    credentials: {
      client: {
        id: EnvHelper.GOOGLE_CLIENT_ID,
        secret: EnvHelper.GOOGLE_CLIENT_SECRET,
      },
      auth: oauth2.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: '/auth/google',
    callbackUri: EnvHelper.OAUTH_CALLBACK_URL,
    pkce: 'S256',
  })

  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB
    },
  })

  fastify.addHook('onRequest', async (request, reply) => {
    const { pathname, searchParams } = new URL(request.url, 'http://localhost')

    if (request.method !== 'GET' || pathname !== '/auth/google') return

    const challenge = searchParams.get('cc')

    if (!challenge || challenge.length > 128 || !/^[A-Za-z0-9_-]+$/.test(challenge)) return

    reply.setCookie(PKCE_COOKIE_NAME, challenge, {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: '/auth',
      maxAge: 600,
    })
  })

  await fastify.register(healthRoute)
  await fastify.register(authRoute)
  await fastify.register(onboardingRoute)
  await fastify.register(chatRoute)
  await fastify.register(paymentsRoute)
  await fastify.register(destinationsRoute)
  await fastify.register(customersRoute)
  await fastify.register(kycRoute)
  await fastify.register(balanceRoute)
  await fastify.register(quotesRoute)
  await fastify.register(webhooksRoute)

  await fastify.listen({ port: EnvHelper.PORT, host: '0.0.0.0' })

  fastify.log.info(`FractaPay server running on port ${EnvHelper.PORT}`)
}

bootstrap().catch(error => {
  console.error(error)
  process.exit(1)
})

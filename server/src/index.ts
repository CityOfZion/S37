import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import oauth2 from '@fastify/oauth2'
import Fastify from 'fastify'

import { isProduction } from './constants'
import { EnvHelper } from './helpers/EnvHelper'
import { authRoute } from './routes/auth-route'
import { chatRoute } from './routes/chat-route'
import { etherfuseRoute } from './routes/etherfuse-route'
import { healthRoute } from './routes/health-route'

const fastify = Fastify({
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

  await fastify.register(cors, {
    origin: [EnvHelper.CORS_ORIGIN],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
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

  await fastify.register(healthRoute)
  await fastify.register(authRoute)
  await fastify.register(etherfuseRoute)
  await fastify.register(chatRoute)

  await fastify.listen({ port: EnvHelper.PORT, host: '0.0.0.0' })

  fastify.log.info(`FractaPay server running on port ${EnvHelper.PORT}`)
}

bootstrap().catch(error => {
  console.error(error)
  process.exit(1)
})

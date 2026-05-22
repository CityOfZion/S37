import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import Fastify from 'fastify'

import { isProduction } from './constants'
import { EnvHelper } from './helpers/EnvHelper'
import { chatRoute } from './routes/chat-route'
import { etherfuseRoute } from './routes/etherfuse-route'
import { healthRoute } from './routes/health-route'
import { uploadRoute } from './routes/upload-route'

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
  await fastify.register(cors, {
    origin: [EnvHelper.CORS_ORIGIN],
    methods: ['GET', 'POST', 'OPTIONS'],
  })

  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB
    },
  })

  await fastify.register(healthRoute)
  await fastify.register(uploadRoute)
  await fastify.register(etherfuseRoute)
  await fastify.register(chatRoute)

  await fastify.listen({ port: EnvHelper.PORT, host: '0.0.0.0' })

  fastify.log.info(`FractaPay server running on port ${EnvHelper.PORT}`)
}

bootstrap().catch(error => {
  console.error(error)
  process.exit(1)
})

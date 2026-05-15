import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import Fastify from 'fastify'

import { EnvHelper } from './helpers/EnvHelper'
import { etherfuseRoute } from './routes/etherfuse-route'
import { healthRoute } from './routes/health-route'
import { uploadRoute } from './routes/upload-route'

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  },
})

async function bootstrap(): Promise<void> {
  await fastify.register(cors, {
    origin: true,
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

  await fastify.listen({ port: EnvHelper.PORT, host: '0.0.0.0' })

  fastify.log.info(`FractaPay server running on port ${EnvHelper.PORT}`)
}

bootstrap().catch(error => {
  console.error(error)
  process.exit(1)
})

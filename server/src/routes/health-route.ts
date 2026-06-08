import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import { SERVICE_NAME } from '../constants'

export const healthRoute = async (fastify: FastifyInstance): Promise<void> => {
  const handler = async (_request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return reply.status(200).send({ status: 'ok', service: SERVICE_NAME })
  }

  // Exempt from rate limiting — a 429 on Fly's /health probe would trigger a restart.
  fastify.get('/', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, handler)
  fastify.get('/health', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, handler)
}

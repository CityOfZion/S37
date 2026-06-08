import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import { SERVICE_NAME } from '../constants'

export const healthRoute = async (fastify: FastifyInstance): Promise<void> => {
  const handler = async (_request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return reply.status(200).send({ status: 'ok', service: SERVICE_NAME })
  }

  fastify.get('/', handler)
  fastify.get('/health', handler)
}

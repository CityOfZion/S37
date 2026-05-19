import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

export const healthRoute = async (fastify: FastifyInstance): Promise<void> => {
  const handler = async (_request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return reply.status(200).send({ status: 'ok', service: 'fractapay-server' })
  }

  fastify.get('/', handler)
  fastify.get('/health', handler)
}

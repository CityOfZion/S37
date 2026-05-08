import type { FastifyInstance } from 'fastify'

export const healthRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/health', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok', service: 'fractapay-server' })
  })
}

import type { FastifyInstance } from 'fastify'

import { ErrorCode } from 'fractapay-shared'

import { requireAuth } from '../hooks/require-auth'
import { createDestinationsSchema, updateDestinationsSchema } from '../schemas/destinations-schema'
import {
  createDestination,
  deleteDestination,
  findDestinationsByUserId,
  updateDestination,
} from '../services/destinations-service'

type TDestinationsParams = { id: string }

export const destinationsRoute = (fastify: FastifyInstance): void => {
  fastify.get('/destinations', { preHandler: requireAuth }, async (request, reply) => {
    const destinations = await findDestinationsByUserId(request.user.id)

    return reply.send({ success: true, destinations })
  })

  fastify.post('/destinations', { preHandler: requireAuth }, async (request, reply) => {
    const result = createDestinationsSchema.safeParse(request.body)

    if (!result.success) {
      return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
    }

    try {
      const destination = await createDestination({ userId: request.user.id, data: result.data })

      return reply.status(201).send({ success: true, destination })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === ErrorCode.DESTINATION_NAME_EXISTS) {
          return reply
            .status(409)
            .send({ success: false, error: ErrorCode.DESTINATION_NAME_EXISTS })
        }

        if (error.message === ErrorCode.DESTINATION_PIX_KEY_EXISTS) {
          return reply
            .status(409)
            .send({ success: false, error: ErrorCode.DESTINATION_PIX_KEY_EXISTS })
        }
      }

      throw error
    }
  })

  fastify.patch('/destinations/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as TDestinationsParams
    const result = updateDestinationsSchema.safeParse(request.body)

    if (!result.success) {
      return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
    }

    try {
      const destination = await updateDestination({
        id,
        userId: request.user.id,
        data: result.data,
      })

      return reply.send({ success: true, destination })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === ErrorCode.DESTINATION_NOT_FOUND) {
          return reply.status(404).send({ success: false, error: ErrorCode.DESTINATION_NOT_FOUND })
        }

        if (error.message === ErrorCode.DESTINATION_NAME_EXISTS) {
          return reply
            .status(409)
            .send({ success: false, error: ErrorCode.DESTINATION_NAME_EXISTS })
        }

        if (error.message === ErrorCode.DESTINATION_PIX_KEY_EXISTS) {
          return reply
            .status(409)
            .send({ success: false, error: ErrorCode.DESTINATION_PIX_KEY_EXISTS })
        }
      }

      throw error
    }
  })

  fastify.delete('/destinations/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as TDestinationsParams

    try {
      await deleteDestination({ id, userId: request.user.id })

      return reply.send({ success: true })
    } catch (error) {
      if (error instanceof Error && error.message === ErrorCode.DESTINATION_NOT_FOUND) {
        return reply.status(404).send({ success: false, error: ErrorCode.DESTINATION_NOT_FOUND })
      }

      throw error
    }
  })
}

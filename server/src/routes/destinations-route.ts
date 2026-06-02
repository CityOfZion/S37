import type { FastifyInstance } from 'fastify'

import type { TDestination } from 'fractapay-shared'
import { EErrorCode } from 'fractapay-shared'

import { requireAuth } from '../hooks/require-auth'
import { createDestinationsSchema, updateDestinationsSchema } from '../schemas/destinations-schema'
import {
  createDestination,
  deleteDestination,
  findDestinationsByUserId,
  updateDestination,
} from '../services/destinations-service'

type TDestinationParams = { Params: { id: string } }

type TCreateDestinationParams = { Body: TDestination }

export const destinationsRoute = (fastify: FastifyInstance): void => {
  fastify.get('/destinations', { preHandler: requireAuth }, async (request, reply) => {
    const destinations = await findDestinationsByUserId(request.user.id)

    return reply.send(destinations)
  })

  fastify.post<TCreateDestinationParams>(
    '/destinations',
    { preHandler: requireAuth },
    async (request, reply) => {
      const result = createDestinationsSchema.safeParse(request.body)

      if (!result.success) {
        return reply.status(400).send({ error: EErrorCode.INVALID_PAYLOAD })
      }

      try {
        const destination = await createDestination({ userId: request.user.id, data: result.data })

        return reply.status(201).send(destination)
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === EErrorCode.DESTINATION_NAME_EXISTS) {
            return reply.status(409).send({ error: EErrorCode.DESTINATION_NAME_EXISTS })
          }

          if (error.message === EErrorCode.DESTINATION_PIX_KEY_EXISTS) {
            return reply.status(409).send({ error: EErrorCode.DESTINATION_PIX_KEY_EXISTS })
          }
        }

        throw error
      }
    }
  )

  fastify.patch<TDestinationParams>(
    '/destinations/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params
      const result = updateDestinationsSchema.safeParse(request.body)

      if (!result.success) {
        return reply.status(400).send({ error: EErrorCode.INVALID_PAYLOAD })
      }

      try {
        const destination = await updateDestination({
          id,
          userId: request.user.id,
          data: result.data,
        })

        return reply.send(destination)
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === EErrorCode.DESTINATION_NOT_FOUND) {
            return reply.status(404).send({ error: EErrorCode.DESTINATION_NOT_FOUND })
          }

          if (error.message === EErrorCode.DESTINATION_NAME_EXISTS) {
            return reply.status(409).send({ error: EErrorCode.DESTINATION_NAME_EXISTS })
          }

          if (error.message === EErrorCode.DESTINATION_PIX_KEY_EXISTS) {
            return reply.status(409).send({ error: EErrorCode.DESTINATION_PIX_KEY_EXISTS })
          }
        }

        throw error
      }
    }
  )

  fastify.delete<TDestinationParams>(
    '/destinations/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params

      try {
        await deleteDestination({ id, userId: request.user.id })

        return reply.status(204).send()
      } catch (error) {
        if (error instanceof Error && error.message === EErrorCode.DESTINATION_NOT_FOUND) {
          return reply.status(404).send({ error: EErrorCode.DESTINATION_NOT_FOUND })
        }

        throw error
      }
    }
  )
}

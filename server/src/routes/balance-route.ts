import type { FastifyInstance } from 'fastify'

import type { TBalanceResult } from 'fractapay-shared'
import { ErrorCode, StellarHelper } from 'fractapay-shared'

import { getTesouroBalanceInBrl } from '../services/balance-service'

type TErrorResponse = { success: false; error: ErrorCode }

const mapError = (error: unknown): ErrorCode => {
  const message = (error as Error).message as ErrorCode

  return Object.values(ErrorCode).includes(message) ? message : ErrorCode.UNKNOWN
}

export const balanceRoute = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get<{ Params: { publicKey: string }; Reply: TBalanceResult | TErrorResponse }>(
    '/balance/:publicKey',
    async (request, reply) => {
      const { publicKey } = request.params

      if (!StellarHelper.isValidStellarDestination(publicKey)) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_ADDRESS })
      }

      try {
        const result = await getTesouroBalanceInBrl(publicKey)

        return reply.status(200).send(result)
      } catch (error) {
        return reply.status(502).send({ success: false, error: mapError(error) })
      }
    }
  )
}

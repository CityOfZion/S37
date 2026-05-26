import type { preHandlerHookHandler } from 'fastify'

import { ErrorCode, type TUser } from 'fractapay-shared'

import { findUserById, mapUserToTUser } from '../services/user-service'

type TJwtPayload = {
  sub: string
  email: string
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: TJwtPayload
    user: TUser
  }
}

const verifyToken = async (
  request: Parameters<preHandlerHookHandler>[0]
): Promise<TJwtPayload | null> => {
  try {
    return await request.jwtVerify<TJwtPayload>()
  } catch (error) {
    request.log.info({ error: (error as Error).message }, '[Auth] jwtVerify failed')

    return null
  }
}

export const requireAuth: preHandlerHookHandler = async (request, reply) => {
  const payload = await verifyToken(request)

  if (!payload) {
    return reply.status(401).send({ success: false, error: ErrorCode.UNAUTHORIZED })
  }

  const user = await findUserById(payload.sub)

  if (!user) {
    return reply.status(401).send({ success: false, error: ErrorCode.SESSION_EXPIRED })
  }

  request.user = mapUserToTUser(user)
}

export const optionalAuth: preHandlerHookHandler = async request => {
  const payload = await verifyToken(request)

  if (!payload) {
    return
  }

  const user = await findUserById(payload.sub)

  if (!user) {
    return
  }

  request.user = mapUserToTUser(user)
}

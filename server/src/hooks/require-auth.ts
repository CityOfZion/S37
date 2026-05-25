import type { preHandlerHookHandler } from 'fastify'

import { ErrorCode, type TSession, type TUser } from 'fractapay-shared'

import { EnvHelper } from '../helpers/EnvHelper'
import { getSessionWithUser, mapUserToTUser } from '../services/session-service'

declare module 'fastify' {
  interface FastifyRequest {
    user?: TUser
    session?: TSession
  }
}

const readSessionId = (
  request: Parameters<preHandlerHookHandler>[0]
): { ok: true; sessionId: string } | { ok: false } => {
  const raw = request.cookies[EnvHelper.SESSION_COOKIE_NAME]

  const cookieNames = Object.keys(request.cookies)
  const origin = request.headers.origin
  const cookieHeader = request.headers.cookie

  request.log.info(
    {
      cookieNames,
      hasSessionCookie: Boolean(raw),
      origin,
      cookieHeaderPresent: Boolean(cookieHeader),
    },
    '[Auth] requireAuth inspect'
  )

  if (!raw) {
    return { ok: false }
  }

  const unsigned = request.unsignCookie(raw)

  request.log.info({ unsigned }, '[Auth] unsigned cookie result')

  if (!unsigned.valid || !unsigned.value) {
    return { ok: false }
  }

  return { ok: true, sessionId: unsigned.value }
}

const toTSession = (session: { id: string; userId: string; expiresAt: Date }): TSession => ({
  id: session.id,
  userId: session.userId,
  expiresAt: session.expiresAt.toISOString(),
})

export const requireAuth: preHandlerHookHandler = async (request, reply) => {
  const cookie = readSessionId(request)

  if (!cookie.ok) {
    return reply.status(401).send({ success: false, error: ErrorCode.UNAUTHORIZED })
  }

  const result = await getSessionWithUser(cookie.sessionId)

  if (!result) {
    return reply.status(401).send({ success: false, error: ErrorCode.SESSION_EXPIRED })
  }

  request.user = mapUserToTUser(result.user)
  request.session = toTSession(result.session)
}

export const optionalAuth: preHandlerHookHandler = async request => {
  const cookie = readSessionId(request)

  if (!cookie.ok) {
    return
  }

  const result = await getSessionWithUser(cookie.sessionId)

  if (!result) {
    return
  }

  request.user = mapUserToTUser(result.user)
  request.session = toTSession(result.session)
}

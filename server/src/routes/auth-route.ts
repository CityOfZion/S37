import type { OAuth2Namespace } from '@fastify/oauth2'
import axios from 'axios'
import type { FastifyInstance } from 'fastify'

import { ErrorCode, type TAuthMeResult, type TCompleteOnboardingPayload } from 'fractapay-shared'

declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace
  }
}

import { isProduction } from '../constants'
import { EnvHelper } from '../helpers/EnvHelper'
import { optionalAuth, requireAuth } from '../hooks/require-auth'
import {
  createSession,
  deleteSession,
  mapUserToTUser,
  SESSION_MAX_AGE_SECONDS,
} from '../services/session-service'
import { markOnboardingCompleted, upsertGoogleUser } from '../services/user-service'

const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

type TGoogleUserInfo = {
  sub: string
  email: string
  email_verified?: boolean
  name?: string
  picture?: string
}

export const authRoute = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/auth/google/callback', async (request, reply) => {
    try {
      const tokenResponse =
        await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request)
      const accessToken = tokenResponse.token.access_token

      const { data } = await axios.get<TGoogleUserInfo>(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10_000,
      })

      const token = tokenResponse.token as typeof tokenResponse.token & {
        id_token?: string
        scope?: string
      }

      const user = await upsertGoogleUser({
        profile: data,
        tokenSet: {
          access_token: token.access_token,
          refresh_token: token.refresh_token,
          id_token: token.id_token,
          token_type: token.token_type,
          scope: token.scope,
          expires_at: token.expires_at,
        },
      })

      const session = await createSession({
        userId: user.id,
        userAgent: request.headers['user-agent'] ?? null,
        ip: request.ip,
      })

      reply.setCookie(EnvHelper.SESSION_COOKIE_NAME, session.id, {
        signed: true,
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
        domain: EnvHelper.COOKIE_DOMAIN,
      })

      request.log.info({ userId: user.id, email: user.email }, '[Auth] login')

      return reply.redirect(EnvHelper.WEB_LOGIN_SUCCESS_URL)
    } catch (error) {
      request.log.error({ error }, '[Auth] OAuth callback failed')

      return reply.redirect(EnvHelper.WEB_LOGIN_FAILURE_URL)
    }
  })

  fastify.get<{ Reply: TAuthMeResult }>(
    '/auth/me',
    { preHandler: requireAuth },
    async (request, reply) => {
      return reply.status(200).send({ success: true, user: request.user! })
    }
  )

  fastify.post<{ Reply: { success: true } }>(
    '/auth/logout',
    { preHandler: optionalAuth },
    async (request, reply) => {
      if (request.session) {
        await deleteSession(request.session.id)
      }

      reply.clearCookie(EnvHelper.SESSION_COOKIE_NAME, {
        path: '/',
        domain: EnvHelper.COOKIE_DOMAIN,
      })

      request.log.info({ userId: request.user?.id }, '[Auth] logout')

      return reply.status(200).send({ success: true })
    }
  )

  fastify.post<{ Reply: { success: false; error: ErrorCode } }>(
    '/auth/signup',
    async (request, reply) => {
      request.log.info('[Auth] signup endpoint hit — not yet implemented')

      return reply.status(501).send({ success: false, error: ErrorCode.NOT_IMPLEMENTED })
    }
  )

  fastify.post<{ Body: TCompleteOnboardingPayload; Reply: TAuthMeResult }>(
    '/auth/onboarding',
    { preHandler: requireAuth },
    async (request, reply) => {
      const companyName = request.body?.companyName?.trim()

      if (!companyName) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
      }

      // TODO: persist missing necessary data when columns land
      const updated = await markOnboardingCompleted(request.user!.id, companyName)

      request.log.info({ userId: updated.id }, '[Auth] onboarding completed')

      return reply.status(200).send({ success: true, user: mapUserToTUser(updated) })
    }
  )
}

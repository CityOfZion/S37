import type { OAuth2Namespace } from '@fastify/oauth2'
import axios from 'axios'
import type { FastifyInstance } from 'fastify'

import { ErrorCode, type TAuthMeResult, type TUser } from 'fractapay-shared'

declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace
  }
}

import { isProduction } from '../constants'
import { EnvHelper } from '../helpers/EnvHelper'

const SESSION_COOKIE = 'fractapay_session'
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

type TGoogleUserInfo = {
  sub: string
  email: string
  name: string
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

      const user: TUser = {
        id: data.sub,
        email: data.email,
        name: data.name,
        picture: data.picture,
      }

      const sessionToken = fastify.jwt.sign(user, { expiresIn: '7d' })

      reply.setCookie(SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
        domain: EnvHelper.COOKIE_DOMAIN,
      })

      request.log.info({ userId: user.id, email: user.email }, '[Auth] login')

      return reply.redirect(EnvHelper.WEB_BASE_URL)
    } catch (error) {
      request.log.error({ error }, '[Auth] OAuth callback failed')

      return reply.redirect(EnvHelper.WEB_BASE_URL)
    }
  })

  fastify.get<{ Reply: TAuthMeResult }>('/auth/me', async (request, reply) => {
    try {
      const user = await request.jwtVerify<TUser>({ onlyCookie: true })

      return reply.status(200).send({ success: true, user })
    } catch {
      return reply.status(401).send({ success: false, error: ErrorCode.UNAUTHORIZED })
    }
  })

  fastify.post<{ Reply: { success: true } }>('/auth/logout', async (request, reply) => {
    reply.clearCookie(SESSION_COOKIE, {
      path: '/',
      domain: EnvHelper.COOKIE_DOMAIN,
    })

    request.log.info('[Auth] logout')

    return reply.status(200).send({ success: true })
  })

  fastify.post<{ Reply: { success: false; error: ErrorCode } }>(
    '/auth/signup',
    async (request, reply) => {
      // TODO(signup): implement email/password (or magic-link) sign-up.
      request.log.info('[Auth] signup endpoint hit — not yet implemented')

      return reply.status(501).send({ success: false, error: ErrorCode.NOT_IMPLEMENTED })
    }
  )
}

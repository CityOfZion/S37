import type { OAuth2Namespace } from '@fastify/oauth2'
import axios from 'axios'
import type { FastifyInstance } from 'fastify'

import type {
  TAuthToken,
  TCompleteOnboardingPayload,
  TExchangePayload,
  TUser,
} from 'fractapay-shared'
import { EErrorCode } from 'fractapay-shared'

declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace
  }
}

import { EnvHelper } from '../helpers/EnvHelper'
import { PkceHelper } from '../helpers/PkceHelper'
import { optionalAuth, requireAuth } from '../hooks/require-auth'
import { consumeAuthCode, createAuthCode } from '../services/auth-code-store'
import {
  mapUserToTUser,
  markOnboardingCompleted,
  upsertGoogleUser,
} from '../services/users-service'

const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'
const JWT_EXPIRES_IN = '7d'

type TGoogleUserInfoResponse = {
  sub: string
  email: string
  email_verified?: boolean
  name?: string
  picture?: string
}

type TExchangeParams = { Body: TExchangePayload }

type TCompleteOnboardingParams = { Body: TCompleteOnboardingPayload }

export const authRoute = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/auth/google/callback', async (request, reply) => {
    try {
      const tokenResponse =
        await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request)
      const accessToken = tokenResponse.token.access_token

      const { data } = await axios.get<TGoogleUserInfoResponse>(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10_000,
      })

      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate')
      reply.header('Pragma', 'no-cache')

      if (!data.email_verified) {
        return reply.redirect(EnvHelper.WEB_LOGIN_FAILURE_URL)
      }

      const user = await upsertGoogleUser({ profile: data })

      const signedChallenge = request.cookies.fractapay_pkce
      const unsigned = signedChallenge ? request.unsignCookie(signedChallenge) : null
      const challenge = unsigned?.valid ? unsigned.value : null

      reply.clearCookie('fractapay_pkce', { path: '/auth' })

      if (!challenge) {
        return reply.redirect(EnvHelper.WEB_LOGIN_FAILURE_URL)
      }

      const code = createAuthCode({ userId: user.id, email: user.email, challenge })
      const successUrl = new URL(EnvHelper.WEB_LOGIN_SUCCESS_URL)

      successUrl.searchParams.set('code', code)

      return reply.redirect(successUrl.toString())
    } catch {
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate')
      reply.header('Pragma', 'no-cache')

      return reply.redirect(EnvHelper.WEB_LOGIN_FAILURE_URL)
    }
  })

  fastify.post<TExchangeParams>('/auth/exchange', async (request, reply) => {
    const code = request.body?.code
    const verifier = request.body?.verifier

    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate')
    reply.header('Pragma', 'no-cache')

    if (typeof code !== 'string' || !code || typeof verifier !== 'string' || !verifier) {
      return reply.status(400).send({ error: EErrorCode.INVALID_PAYLOAD })
    }

    const entry = consumeAuthCode(code)

    if (!entry || !PkceHelper.verifyChallenge(verifier, entry.challenge)) {
      return reply.status(400).send({ error: EErrorCode.INVALID_AUTH_CODE })
    }

    const token = await reply.jwtSign(
      { sub: entry.userId, email: entry.email },
      { expiresIn: JWT_EXPIRES_IN }
    )

    return reply.status(200).send({ token } satisfies TAuthToken)
  })

  fastify.get('/auth/me', { preHandler: requireAuth }, async (request, reply) => {
    return reply.status(200).send(request.user!)
  })

  fastify.post('/auth/logout', { preHandler: optionalAuth }, async (request, reply) => {
    return reply.status(204).send()
  })

  fastify.post('/auth/signup', async (request, reply) => {
    return reply.status(501).send({ error: EErrorCode.NOT_IMPLEMENTED })
  })

  fastify.post<TCompleteOnboardingParams>(
    '/auth/onboarding',
    { preHandler: requireAuth },
    async (request, reply) => {
      const companyName = request.body?.companyName?.trim()

      if (!companyName) {
        return reply.status(400).send({ error: EErrorCode.INVALID_PAYLOAD })
      }

      const updated = await markOnboardingCompleted(request.user!.id, companyName)

      return reply.status(200).send(mapUserToTUser(updated) satisfies TUser)
    }
  )
}

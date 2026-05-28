import type { OAuth2Namespace } from '@fastify/oauth2'
import axios from 'axios'
import type { FastifyInstance } from 'fastify'

import {
  ErrorCode,
  StellarHelper,
  type TAuthMeResult,
  type TCompleteOnboardingPayload,
  type TExchangePayload,
  type TExchangeResult,
} from 'fractapay-shared'

declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace
  }
}

import { EnvHelper } from '../helpers/EnvHelper'
import { PkceHelper } from '../helpers/PkceHelper'
import { optionalAuth, requireAuth } from '../hooks/require-auth'
import { consumeAuthCode, createAuthCode } from '../services/auth-code-store'
import { mapUserToTUser, markOnboardingCompleted, upsertGoogleUser } from '../services/user-service'

const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

const JWT_EXPIRES_IN = '7d'

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

      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate')
      reply.header('Pragma', 'no-cache')

      if (!data.email_verified) {
        request.log.warn({ email: data.email }, '[Auth] unverified Google email rejected')

        return reply.redirect(EnvHelper.WEB_LOGIN_FAILURE_URL)
      }

      const user = await upsertGoogleUser({ profile: data })

      const signedChallenge = request.cookies.fractapay_pkce
      const unsigned = signedChallenge ? request.unsignCookie(signedChallenge) : null
      const challenge = unsigned?.valid ? unsigned.value : null

      reply.clearCookie('fractapay_pkce', { path: '/auth' })

      if (!challenge) {
        request.log.warn({ userId: user.id }, '[Auth] missing PKCE challenge cookie')

        return reply.redirect(EnvHelper.WEB_LOGIN_FAILURE_URL)
      }

      const code = createAuthCode({ userId: user.id, email: user.email, challenge })

      request.log.info({ userId: user.id, email: user.email }, '[Auth] login')

      const successUrl = new URL(EnvHelper.WEB_LOGIN_SUCCESS_URL)
      successUrl.searchParams.set('code', code)

      return reply.redirect(successUrl.toString())
    } catch (error) {
      request.log.error({ error }, '[Auth] OAuth callback failed')

      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate')
      reply.header('Pragma', 'no-cache')

      return reply.redirect(EnvHelper.WEB_LOGIN_FAILURE_URL)
    }
  })

  fastify.post<{ Body: TExchangePayload; Reply: TExchangeResult }>(
    '/auth/exchange',
    async (request, reply) => {
      const code = request.body?.code
      const verifier = request.body?.verifier

      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate')
      reply.header('Pragma', 'no-cache')

      if (typeof code !== 'string' || !code || typeof verifier !== 'string' || !verifier) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
      }

      const entry = consumeAuthCode(code)

      if (!entry || !PkceHelper.verifyChallenge(verifier, entry.challenge)) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_AUTH_CODE })
      }

      const token = await reply.jwtSign(
        { sub: entry.userId, email: entry.email },
        { expiresIn: JWT_EXPIRES_IN }
      )

      request.log.info({ userId: entry.userId }, '[Auth] code exchanged')

      return reply.status(200).send({ success: true, token })
    }
  )

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
      const stellarAddress = request.body?.stellarAddress?.trim()
      const passkeyCredentialId = request.body?.passkeyCredentialId?.trim()

      if (!companyName || !stellarAddress || !passkeyCredentialId) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
      }

      if (!StellarHelper.isValidContractAddress(stellarAddress)) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_ADDRESS })
      }

      // TODO: persist missing necessary data when columns land
      const updated = await markOnboardingCompleted(request.user!.id, {
        companyName,
        stellarAddress,
        passkeyCredentialId,
      })

      request.log.info({ userId: updated.id }, '[Auth] onboarding completed')

      return reply.status(200).send({ success: true, user: mapUserToTUser(updated) })
    }
  )
}

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
  type TPasskeyLoginPayload,
  type TPasskeyLoginResult,
  type TSignupRequestPayload,
  type TSignupRequestResult,
  type TSignupVerifyPayload,
  type TSignupVerifyResult,
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
import { sendVerificationCode } from '../services/email-service'
import {
  consumeChallenge,
  createChallenge,
  normalizeEmail,
} from '../services/email-verification-store'
import {
  findUserByEmail,
  findUserByStellarAddress,
  mapUserToTUser,
  markOnboardingCompleted,
  upsertEmailVerifiedUser,
  upsertGoogleUser,
} from '../services/user-service'

const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

const JWT_EXPIRES_IN = '7d'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isLikelyEmail = (value: string): boolean => EMAIL_REGEX.test(value)

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

  fastify.post<{ Body: TSignupRequestPayload; Reply: TSignupRequestResult }>(
    '/auth/signup/request',
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate')

      const fullName = request.body?.fullName?.trim()
      const rawEmail = request.body?.email?.trim()

      if (!fullName || !rawEmail || !isLikelyEmail(rawEmail)) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
      }

      const email = normalizeEmail(rawEmail)
      const existing = await findUserByEmail(email)

      if (existing) {
        const hasOAuthAccount = existing.accounts.some(account => account.provider === 'google')

        if (hasOAuthAccount) {
          return reply.status(409).send({ success: false, error: ErrorCode.EMAIL_LINKED_TO_OAUTH })
        }

        // Only a completed signup (onboarding finished) blocks a new attempt.
        if (existing.onboardingCompletedAt) {
          return reply
            .status(409)
            .send({ success: false, error: ErrorCode.EMAIL_ALREADY_REGISTERED })
        }
      }

      const challenge = createChallenge({ email, fullName })

      if (!challenge.ok) {
        return reply.status(429).send({
          success: false,
          error: ErrorCode.RESEND_TOO_SOON,
          cooldownEndsAt: new Date(challenge.cooldownEndsAt).toISOString(),
        })
      }

      try {
        await sendVerificationCode({ email, code: challenge.code, fullName })
      } catch (error) {
        request.log.error({ err: error, email }, '[Auth] failed to send verification email')

        return reply.status(502).send({ success: false, error: ErrorCode.EMAIL_SEND_FAILED })
      }

      request.log.info({ email }, '[Auth] signup verification code dispatched')

      return reply.status(200).send({
        success: true,
        expiresAt: new Date(challenge.expiresAt).toISOString(),
        cooldownEndsAt: new Date(challenge.cooldownEndsAt).toISOString(),
      })
    }
  )

  fastify.post<{ Body: TSignupVerifyPayload; Reply: TSignupVerifyResult }>(
    '/auth/signup/verify',
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate')

      const rawEmail = request.body?.email?.trim()
      const code = request.body?.code?.trim()

      if (!rawEmail || !isLikelyEmail(rawEmail) || !code || !/^\d{6}$/.test(code)) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
      }

      const email = normalizeEmail(rawEmail)
      const result = consumeChallenge({ email, code })

      if (!result.ok) {
        const error =
          result.reason === 'expired'
            ? ErrorCode.VERIFICATION_EXPIRED
            : result.reason === 'too_many_attempts'
              ? ErrorCode.TOO_MANY_VERIFICATION_ATTEMPTS
              : ErrorCode.INVALID_VERIFICATION_CODE

        return reply.status(400).send({ success: false, error })
      }

      const existing = await findUserByEmail(email)

      if (existing) {
        const hasOAuthAccount = existing.accounts.some(account => account.provider === 'google')

        if (hasOAuthAccount) {
          return reply.status(409).send({ success: false, error: ErrorCode.EMAIL_LINKED_TO_OAUTH })
        }

        // Mirror the request-side guard: only a completed signup (onboarding finished) is rejected.
        // An incomplete row is an abandoned attempt and gets reused by upsertEmailVerifiedUser.
        if (existing.onboardingCompletedAt) {
          return reply
            .status(409)
            .send({ success: false, error: ErrorCode.EMAIL_ALREADY_REGISTERED })
        }
      }

      const user = await upsertEmailVerifiedUser({ email, fullName: result.fullName })

      const token = await reply.jwtSign(
        { sub: user.id, email: user.email },
        { expiresIn: JWT_EXPIRES_IN }
      )

      request.log.info({ userId: user.id, email }, '[Auth] signup verified')

      return reply.status(200).send({ success: true, token, user: mapUserToTUser(user) })
    }
  )

  fastify.post<{ Body: TPasskeyLoginPayload; Reply: TPasskeyLoginResult }>(
    '/auth/passkey/login',
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate')

      const stellarAddress = request.body?.stellarAddress?.trim()

      if (!stellarAddress || !StellarHelper.isValidContractAddress(stellarAddress)) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
      }

      // TODO: this trusts the client-supplied wallet address (the WebAuthn assertion is
      // verified only in the browser). Add a server-side WebAuthn challenge/assertion check
      // to cryptographically prove control of the passkey before issuing the session.
      const user = await findUserByStellarAddress(stellarAddress)

      if (!user) {
        return reply.status(404).send({ success: false, error: ErrorCode.WALLET_NOT_REGISTERED })
      }

      const token = await reply.jwtSign(
        { sub: user.id, email: user.email },
        { expiresIn: JWT_EXPIRES_IN }
      )

      request.log.info({ userId: user.id }, '[Auth] passkey login')

      return reply.status(200).send({ success: true, token, user: mapUserToTUser(user) })
    }
  )

  fastify.post<{ Body: TCompleteOnboardingPayload; Reply: TAuthMeResult }>(
    '/auth/onboarding',
    { preHandler: requireAuth },
    async (request, reply) => {
      if (request.user!.onboardingCompletedAt) {
        return reply
          .status(409)
          .send({ success: false, error: ErrorCode.ONBOARDING_ALREADY_COMPLETED })
      }

      const companyName = request.body?.companyName?.trim()
      const stellarAddress = request.body?.stellarAddress?.trim()
      const passkeyCredentialId = request.body?.passkeyCredentialId?.trim()

      if (!companyName || !stellarAddress || !passkeyCredentialId) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
      }

      if (!StellarHelper.isValidContractAddress(stellarAddress)) {
        return reply.status(400).send({ success: false, error: ErrorCode.INVALID_ADDRESS })
      }

      // TODO: the passkey/wallet binding is trusted from the client — the address format is
      // checked but ownership is not. Before production, run a server-side WebAuthn attestation
      // (registration ceremony) and verify the caller controls `stellarAddress` so the
      // email↔passkey link is cryptographically enforced rather than a bare DB association.
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

import type { OAuth2Namespace } from '@fastify/oauth2'
import axios from 'axios'
import type { FastifyInstance } from 'fastify'

import {
  DEFAULT_LANGUAGE,
  EErrorCode,
  StellarHelper,
  SUPPORTED_LANGUAGES,
  type TAuthToken,
  type TCompleteOnboardingPayload,
  type TExchangePayload,
  type TLanguage,
  type TPasskeyLoginPayload,
  type TPasskeyLoginResponse,
  type TSignupRequestPayload,
  type TSignupRequestResponse,
  type TSignupVerifyPayload,
  type TSignupVerifyResponse,
  type TUser,
} from 'fractapay-shared'

import { PKCE_COOKIE_NAME } from '../constants'
import { EnvHelper } from '../helpers/EnvHelper'
import { PkceHelper } from '../helpers/PkceHelper'
import { requireAuth } from '../hooks/require-auth'
import { loginSchema, requestSchema, verifySchema } from '../schemas/auth-schema'
import { consumeAuthCode, createAuthCode } from '../services/auth-code-store'
import { sendVerificationCode } from '../services/email-service'
import {
  consumeChallenge,
  createChallenge,
  normalizeEmail,
} from '../services/email-verification-store'
import {
  findUserByAddress,
  findUserByEmail,
  mapUserToTUser,
  markOnboardingCompleted,
  upsertEmailVerifiedUser,
  upsertGoogleUser,
} from '../services/users-service'

declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace
  }
}

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

type TLoginParams = {
  Body: TPasskeyLoginPayload
  Reply: TPasskeyLoginResponse
}

type TVerifyParams = { Body: TSignupVerifyPayload; Reply: TSignupVerifyResponse }

type TRequestParams = {
  Body: TSignupRequestPayload
  Reply: TSignupRequestResponse
}

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

      const signedChallenge = request.cookies[PKCE_COOKIE_NAME]
      const unsigned = signedChallenge ? request.unsignCookie(signedChallenge) : null
      const challenge = unsigned?.valid ? unsigned.value : null

      reply.clearCookie(PKCE_COOKIE_NAME, { path: '/auth' })

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

  fastify.post<TRequestParams>(
    '/auth/signup/request',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate')

      const parsed = requestSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.status(400).send({ error: EErrorCode.INVALID_PAYLOAD })
      }

      const { fullName } = parsed.data
      const email = normalizeEmail(parsed.data.email)
      const existing = await findUserByEmail(email)

      if (existing) {
        const hasOAuthAccount = existing.accounts.some(account => account.provider === 'google')

        if (hasOAuthAccount) {
          return reply.status(409).send({ error: EErrorCode.EMAIL_LINKED_TO_OAUTH })
        }

        // Only a completed signup (onboarding finished) blocks a new attempt.
        if (existing.onboardingCompletedAt) {
          return reply.status(409).send({ error: EErrorCode.EMAIL_ALREADY_REGISTERED })
        }
      }

      let challenge: Awaited<ReturnType<typeof createChallenge>>

      try {
        challenge = await createChallenge({ email, fullName })
      } catch (error) {
        if (error instanceof Error && error.message === EErrorCode.RESEND_TOO_SOON) {
          return reply.status(429).send({
            error: EErrorCode.RESEND_TOO_SOON,
            cooldownEndsAt: (error as Error & { cooldownEndsAt?: string }).cooldownEndsAt,
          })
        }

        throw error
      }

      const acceptLanguage = request.headers['accept-language']?.split(',')[0]?.trim() || ''
      const language = SUPPORTED_LANGUAGES.includes(acceptLanguage as TLanguage)
        ? (acceptLanguage as TLanguage)
        : DEFAULT_LANGUAGE

      try {
        await sendVerificationCode({ email, code: challenge.code, fullName, language })
      } catch {
        return reply.status(502).send({ error: EErrorCode.EMAIL_SEND_FAILED })
      }

      return reply.status(200).send({
        expiresAt: new Date(challenge.expiresAt).toJSON(),
        cooldownEndsAt: new Date(challenge.cooldownEndsAt).toJSON(),
      })
    }
  )

  fastify.post<TVerifyParams>(
    '/auth/signup/verify',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate')

      const parsed = verifySchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.status(400).send({ error: EErrorCode.INVALID_PAYLOAD })
      }

      const email = normalizeEmail(parsed.data.email)
      const { code } = parsed.data
      let consumeResult: Awaited<ReturnType<typeof consumeChallenge>>

      try {
        consumeResult = await consumeChallenge({ email, code })
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(400).send({ error: error.message as EErrorCode })
        }

        throw error
      }

      const existing = await findUserByEmail(email)

      if (existing) {
        const hasOAuthAccount = existing.accounts.some(account => account.provider === 'google')

        if (hasOAuthAccount) {
          return reply.status(409).send({ error: EErrorCode.EMAIL_LINKED_TO_OAUTH })
        }

        // Mirror the request-side guard: only a completed signup (onboarding finished) is rejected.
        // An incomplete row is an abandoned attempt and gets reused by upsertEmailVerifiedUser.
        if (existing.onboardingCompletedAt) {
          return reply.status(409).send({ error: EErrorCode.EMAIL_ALREADY_REGISTERED })
        }
      }

      const user = await upsertEmailVerifiedUser({ email, fullName: consumeResult.fullName })

      const token = await reply.jwtSign(
        { sub: user.id, email: user.email },
        { expiresIn: JWT_EXPIRES_IN }
      )

      return reply.status(200).send({ token, user: mapUserToTUser(user) })
    }
  )

  fastify.post<TLoginParams>('/auth/passkey/login', async (request, reply) => {
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate')

    const parsed = loginSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.status(400).send({ error: EErrorCode.INVALID_PAYLOAD })
    }

    // TODO: this trusts the client-supplied wallet address (the WebAuthn assertion is
    // verified only in the browser). Add a server-side WebAuthn challenge/assertion check
    // to cryptographically prove control of the passkey before issuing the session.
    const user = await findUserByAddress(parsed.data.address)

    if (!user) {
      return reply.status(404).send({ error: EErrorCode.WALLET_NOT_REGISTERED })
    }

    const token = await reply.jwtSign(
      { sub: user.id, email: user.email },
      { expiresIn: JWT_EXPIRES_IN }
    )

    return reply.status(200).send({ token, user: mapUserToTUser(user) })
  })

  fastify.post<TCompleteOnboardingParams>(
    '/auth/onboarding',
    { preHandler: requireAuth },
    async (request, reply) => {
      if (request.user!.onboardingCompletedAt) {
        return reply.status(409).send({ error: EErrorCode.ONBOARDING_ALREADY_COMPLETED })
      }

      const companyName = request.body?.companyName?.trim()
      const address = request.body?.address?.trim()
      const passkeyCredentialId = request.body?.passkeyCredentialId?.trim()

      if (!companyName || !address || !passkeyCredentialId) {
        return reply.status(400).send({ error: EErrorCode.INVALID_PAYLOAD })
      }

      if (!StellarHelper.isValidContractAddress(address)) {
        return reply.status(400).send({ error: EErrorCode.INVALID_ADDRESS })
      }

      // TODO: the passkey/wallet binding is trusted from the client — the address format is
      // checked but ownership is not. Before production, run a server-side WebAuthn attestation
      // (registration ceremony) and verify the caller controls `address` so the
      // email↔passkey link is cryptographically enforced rather than a bare DB association.
      const updated = await markOnboardingCompleted(request.user!.id, {
        companyName,
        address,
        passkeyCredentialId,
      })

      return reply.status(200).send(mapUserToTUser(updated) satisfies TUser)
    }
  )
}

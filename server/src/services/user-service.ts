import type { TUser } from 'fractapay-shared'

import { prisma, type User } from './prisma-service'

export const mapUserToTUser = (user: User): TUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  picture: user.avatarUrl,
  onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
  stellarAddress: user.stellarAddress,
  passkeyCredentialId: user.passkeyCredentialId,
})

export const findUserById = async (id: string): Promise<User | null> => {
  return prisma.user.findUnique({ where: { id } })
}

export type TUserWithOAuth = User & { accounts: { provider: string }[] }

export const findUserByEmail = async (email: string): Promise<TUserWithOAuth | null> => {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { accounts: { select: { provider: true } } },
  })
}

export const findUserByStellarAddress = async (stellarAddress: string): Promise<User | null> => {
  return prisma.user.findUnique({ where: { stellarAddress } })
}

type TUpsertEmailVerifiedUserInput = {
  email: string
  fullName: string
}

// Upsert (not create) so an abandoned signup — a passkey-less row left behind when the user verified their email but never finished onboarding — is reused on retry instead of colliding with the unique email constraint. Callers must guard against overwriting a completed account (onboarding finished) or an OAuth-linked one before calling this.
export const upsertEmailVerifiedUser = async ({
  email,
  fullName,
}: TUpsertEmailVerifiedUserInput): Promise<User> => {
  const normalizedEmail = email.toLowerCase()

  return prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      name: fullName,
      emailVerified: new Date(),
    },
    create: {
      email: normalizedEmail,
      name: fullName,
      emailVerified: new Date(),
    },
  })
}

type TGoogleProfile = {
  sub: string
  email: string
  email_verified?: boolean
  name?: string
  picture?: string
}

type TUpsertGoogleUserInput = {
  profile: TGoogleProfile
}

export const upsertGoogleUser = async ({ profile }: TUpsertGoogleUserInput): Promise<User> => {
  const emailVerified = profile.email_verified ? new Date() : null

  return prisma.$transaction(async transaction => {
    const user = await transaction.user.upsert({
      where: { email: profile.email },
      update: {
        name: profile.name ?? null,
        avatarUrl: profile.picture ?? null,
        emailVerified,
      },
      create: {
        email: profile.email,
        name: profile.name ?? null,
        avatarUrl: profile.picture ?? null,
        emailVerified,
      },
    })

    await transaction.oAuthAccount.upsert({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: profile.sub,
        },
      },
      update: {},
      create: {
        userId: user.id,
        provider: 'google',
        providerAccountId: profile.sub,
      },
    })

    return user
  })
}

type TMarkOnboardingCompletedInput = {
  companyName: string
  stellarAddress: string
  passkeyCredentialId: string
}

export const markOnboardingCompleted = async (
  userId: string,
  { companyName, stellarAddress, passkeyCredentialId }: TMarkOnboardingCompletedInput
): Promise<User> => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      companyName,
      stellarAddress,
      passkeyCredentialId,
      onboardingCompletedAt: new Date(),
    },
  })
}

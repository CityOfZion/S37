import type { TUser } from 'fractapay-shared'

import { prisma, type User } from './prisma-service'

export const mapUserToTUser = (user: User): TUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  picture: user.avatarUrl,
  onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
})

export const findUserById = async (id: string): Promise<User | null> => {
  return prisma.user.findUnique({ where: { id } })
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

export const markOnboardingCompleted = async (
  userId: string,
  companyName: string
): Promise<User> => {
  return prisma.user.update({
    where: { id: userId },
    data: { companyName, onboardingCompletedAt: new Date() },
  })
}

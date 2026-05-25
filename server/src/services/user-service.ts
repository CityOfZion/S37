import { prisma, type User } from './prisma-service'

type TGoogleProfile = {
  sub: string
  email: string
  email_verified?: boolean
  name?: string
  picture?: string
}

type TGoogleTokenSet = {
  access_token: string
  refresh_token?: string
  id_token?: string
  token_type?: string
  scope?: string
  expires_at?: Date
}

type TUpsertGoogleUserInput = {
  profile: TGoogleProfile
  tokenSet: TGoogleTokenSet
}

export const upsertGoogleUser = async ({
  profile,
  tokenSet,
}: TUpsertGoogleUserInput): Promise<User> => {
  const emailVerified = profile.email_verified ? new Date() : null
  const tokenFields = {
    accessToken: tokenSet.access_token,
    refreshToken: tokenSet.refresh_token ?? null,
    idToken: tokenSet.id_token ?? null,
    tokenType: tokenSet.token_type ?? null,
    scope: tokenSet.scope ?? null,
    expiresAt: tokenSet.expires_at ?? null,
  }

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
      update: tokenFields,
      create: {
        userId: user.id,
        provider: 'google',
        providerAccountId: profile.sub,
        ...tokenFields,
      },
    })

    return user
  })
}

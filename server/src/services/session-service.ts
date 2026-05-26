import type { TUser } from 'fractapay-shared'

import { Prisma, prisma, type Session, type User } from './prisma-service'

export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

type TCreateSessionInput = {
  userId: string
  userAgent?: string | null
  ip?: string | null
}

export const createSession = async ({
  userId,
  userAgent,
  ip,
}: TCreateSessionInput): Promise<Session> => {
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)

  return prisma.session.create({
    data: {
      userId,
      expiresAt,
      userAgent: userAgent ?? null,
      ip: ip ?? null,
    },
  })
}

export const getSessionWithUser = async (
  sessionId: string
): Promise<{ session: Session; user: User } | null> => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  })

  if (!session) {
    return null
  }

  if (session.expiresAt.getTime() < Date.now()) {
    return null
  }

  const { user, ...sessionFields } = session

  return { session: sessionFields, user }
}

export const deleteSession = async (sessionId: string): Promise<void> => {
  try {
    await prisma.session.delete({ where: { id: sessionId } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return
    }

    throw error
  }
}

export const mapUserToTUser = (user: User): TUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  picture: user.avatarUrl,
  onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
})

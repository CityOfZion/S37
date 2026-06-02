import type { TDestination } from 'fractapay-shared'
import { EErrorCode } from 'fractapay-shared'

import { EncryptionHelper } from '../helpers/EncryptionHelper'
import type {
  TCreateDestinationsBody,
  TUpdateDestinationsBody,
} from '../schemas/destinations-schema'
import { PixKeyType, Prisma, prisma, Token } from './prisma-service'

type TRowDestination = {
  id: string
  name: string
  token: Token
  pixKey: string
  pixKeyType: PixKeyType
}

const mapToDestination = ({
  id,
  name,
  token,
  pixKey,
  pixKeyType,
}: TRowDestination): TDestination => ({
  id,
  name,
  token,
  pixKey: EncryptionHelper.decrypt(pixKey),
  pixKeyType,
})

export const findDestinationsByUserId = async (userId: string): Promise<TDestination[]> => {
  const rows = await prisma.destination.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })

  return rows.map(mapToDestination)
}

type TCreateDestinationsParams = {
  userId: string
  data: TCreateDestinationsBody
}

export const createDestination = async ({
  userId,
  data,
}: TCreateDestinationsParams): Promise<TDestination> => {
  const trimmedName = data.name.trim()

  const existingWithName = await prisma.destination.findFirst({
    where: { userId, name: trimmedName },
  })

  if (existingWithName) throw new Error(EErrorCode.DESTINATION_NAME_EXISTS)

  const pixKeyHash = EncryptionHelper.hmac(userId, data.pixKey)

  try {
    const row = await prisma.destination.create({
      data: {
        userId,
        name: trimmedName,
        token: data.token as Token,
        pixKey: EncryptionHelper.encrypt(data.pixKey),
        pixKeyHash,
        pixKeyType: data.pixKeyType as PixKeyType,
      },
    })

    return mapToDestination(row)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error(EErrorCode.DESTINATION_PIX_KEY_EXISTS)
    }

    throw error
  }
}

type TUpdateDestinationsParams = {
  id: string
  userId: string
  data: TUpdateDestinationsBody
}

export const updateDestination = async ({
  id,
  userId,
  data,
}: TUpdateDestinationsParams): Promise<TDestination> => {
  const existing = await prisma.destination.findFirst({ where: { id, userId } })

  if (!existing) throw new Error(EErrorCode.DESTINATION_NOT_FOUND)

  const trimmedName = data.name?.trim()

  if (trimmedName) {
    const existingWithName = await prisma.destination.findFirst({
      where: { userId, name: trimmedName, NOT: { id } },
    })

    if (existingWithName) throw new Error(EErrorCode.DESTINATION_NAME_EXISTS)
  }

  try {
    const { token, pixKey, pixKeyType } = data

    const row = await prisma.destination.update({
      where: { id },
      data: {
        ...(trimmedName && { name: trimmedName }),
        ...(token && { token: token as Token }),
        ...(pixKey && {
          pixKey: EncryptionHelper.encrypt(pixKey),
          pixKeyHash: EncryptionHelper.hmac(userId, pixKey),
        }),
        ...(pixKeyType && { pixKeyType: pixKeyType as PixKeyType }),
      },
    })

    return mapToDestination(row)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error(EErrorCode.DESTINATION_PIX_KEY_EXISTS)
    }

    throw error
  }
}

type TDeleteDestinationsParams = {
  id: string
  userId: string
}

export const deleteDestination = async ({
  id,
  userId,
}: TDeleteDestinationsParams): Promise<void> => {
  const existing = await prisma.destination.findFirst({ where: { id, userId } })

  if (!existing) throw new Error(EErrorCode.DESTINATION_NOT_FOUND)

  await prisma.destination.delete({ where: { id } })
}

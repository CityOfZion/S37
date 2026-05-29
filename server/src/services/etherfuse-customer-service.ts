import { type EtherfuseCustomer, prisma } from './prisma-service'

export const findEtherfuseCustomerByPublicKey = async (
  publicKey: string
): Promise<EtherfuseCustomer | null> => {
  return prisma.etherfuseCustomer.findUnique({ where: { publicKey } })
}

type TUpsertEtherfuseCustomerInput = {
  publicKey: string
  customerId: string
  bankAccountId?: string | null
  userId?: string | null
}

export const upsertEtherfuseCustomer = async ({
  publicKey,
  customerId,
  bankAccountId,
  userId,
}: TUpsertEtherfuseCustomerInput): Promise<EtherfuseCustomer> => {
  const [customer] = await prisma.$transaction([
    prisma.etherfuseCustomer.upsert({
      where: { publicKey },
      update: { customerId, bankAccountId },
      create: { publicKey, customerId, bankAccountId },
    }),
    // When a user owns this wallet, mirror the address onto their row so the
    // stellarAddress stays in sync with the registered Etherfuse customer.
    ...(userId
      ? [prisma.user.update({ where: { id: userId }, data: { stellarAddress: publicKey } })]
      : []),
  ])

  return customer
}

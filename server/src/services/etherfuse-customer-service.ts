import { type EtherfuseCustomer, prisma } from './prisma-service'

export const findEtherfuseCustomerByAddress = async (
  address: string
): Promise<EtherfuseCustomer | null> => {
  return prisma.etherfuseCustomer.findUnique({ where: { address } })
}

type TUpsertEtherfuseCustomerInput = {
  address: string
  customerId: string
  bankAccountId?: string | null
  userId?: string | null
}

export const upsertEtherfuseCustomer = async ({
  address,
  customerId,
  bankAccountId,
  userId,
}: TUpsertEtherfuseCustomerInput): Promise<EtherfuseCustomer> => {
  const [customer] = await prisma.$transaction([
    prisma.etherfuseCustomer.upsert({
      where: { address },
      update: { customerId, bankAccountId },
      create: { address, customerId, bankAccountId },
    }),
    // When a user owns this wallet, mirror the address onto their row so the
    // address stays in sync with the registered Etherfuse customer.
    ...(userId ? [prisma.user.update({ where: { id: userId }, data: { address } })] : []),
  ])

  return customer
}

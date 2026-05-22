import { prisma } from '../src/client'

const main = async (): Promise<void> => {
  const existing = await prisma.healthCheck.count()

  if (existing === 0) {
    await prisma.healthCheck.create({ data: {} })
    console.log('Seeded HealthCheck row')

    return
  }

  console.log(`HealthCheck already has ${existing} row(s); skipping seed`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

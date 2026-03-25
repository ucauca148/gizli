import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const events = await prisma.webhookEvent.findMany({
    orderBy: { receivedAt: 'desc' },
    take: 3
  })

  console.log(JSON.stringify(events, null, 2))
}

main().finally(() => prisma.$disconnect())

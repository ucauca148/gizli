import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Mağaza Verileri Temizleniyor ---')
  
  // İlişkisel veriler olduğu için silme sırası önemlidir
  await prisma.orderItem.deleteMany({})
  await prisma.order.deleteMany({})
  await prisma.product.deleteMany({})
  await prisma.store.deleteMany({})
  await prisma.webhookEvent.deleteMany({})

  console.log('>>> Tüm demo veriler başarıyla silindi. Sistem şu an tertemiz ve gerçek siparişleri bekliyor.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Test verileri (Seed) oluşturuluyor...')

  // 1. Örnek Bir Mağaza (Satıcı) Oluştur
  const store = await prisma.store.upsert({
    where: { storeCode: 'DEMO-STORE-1' },
    update: {},
    create: {
      name: 'Örnek Premium Mağaza',
      storeCode: 'DEMO-STORE-1',
    },
  })

  // 2. Örnek Ürünler
  const p1 = await prisma.product.upsert({
    where: { itemsatisProductId: 'PID-1001' },
    update: {},
    create: {
      storeId: store.id,
      itemsatisProductId: 'PID-1001',
      title: 'Valorant VP (1200 VP)',
      price: 130.50,
      status: 'ACTIVE',
      lastSaleDate: new Date(),
    }
  })

  const p2 = await prisma.product.upsert({
    where: { itemsatisProductId: 'PID-1002' },
    update: {},
    create: {
      storeId: store.id,
      itemsatisProductId: 'PID-1002',
      title: 'Steam 100 TL Cüzdan Kodu',
      price: 99.00,
      status: 'ACTIVE',
      lastSaleDate: new Date(),
    }
  })

  // 3. Örnek Siparişler
  await prisma.order.upsert({
    where: { itemsatisOrderId: 'ORD-5501' },
    update: {},
    create: {
      storeId: store.id,
      itemsatisOrderId: 'ORD-5501',
      status: 'APPROVED',
      totalAmount: 130.50,
      items: {
        create: [
          { productId: p1.id, quantity: 1, unitPrice: 130.50 }
        ]
      }
    }
  })

  await prisma.order.upsert({
    where: { itemsatisOrderId: 'ORD-5502' },
    update: {},
    create: {
      storeId: store.id,
      itemsatisOrderId: 'ORD-5502',
      status: 'PENDING',
      totalAmount: 198.00,
      items: {
        create: [
          { productId: p2.id, quantity: 2, unitPrice: 99.00 }
        ]
      }
    }
  })

  await prisma.order.upsert({
    where: { itemsatisOrderId: 'ORD-5503' },
    update: {},
    create: {
      storeId: store.id,
      itemsatisOrderId: 'ORD-5503',
      status: 'CANCELLED',
      totalAmount: 130.50,
      items: {
        create: [
          { productId: p1.id, quantity: 1, unitPrice: 130.50 }
        ]
      }
    }
  })

  // 4. Örnek Webhook Logları (Geçmiş Senaryo)
  await prisma.webhookEvent.create({
    data: {
      source: 'ITEMSatis',
      eventType: 'order.created',
      payloadRaw: '{"event_type": "order.created", "amount": 130.5, "order_id": "ORD-5501"}',
      payloadJson: { event_type: "order.created", amount: 130.5, order_id: "ORD-5501" },
      status: 'PROCESSED',
      processedAt: new Date(),
    }
  })

  await prisma.webhookEvent.create({
    data: {
      source: 'ITEMSatis',
      eventType: 'order.banned',
      payloadRaw: '{"event_type": "order.banned", "order_id": "XXX"}',
      payloadJson: { event_type: "order.banned", order_id: "XXX" },
      status: 'UNMAPPED',
      errorMessage: 'Bu event desteklenmiyor, pas geçildi',
      processedAt: new Date(),
    }
  })

  console.log('Seed başarıyla tamamlandı ✓ DB Artık dolu.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

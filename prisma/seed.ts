import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.reservation.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  const mumbai = await prisma.warehouse.create({
    data: { name: "Mumbai Central", location: "Mumbai, MH" },
  });
  const delhi = await prisma.warehouse.create({
    data: { name: "Delhi North", location: "Delhi, DL" },
  });
  const bangalore = await prisma.warehouse.create({
    data: { name: "Bangalore Hub", location: "Bangalore, KA" },
  });

  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Wireless Noise-Cancelling Headphones",
        description: "Premium over-ear headphones with 30hr battery life",
        price: 12999,
        sku: "WH-NC-001",
        imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Mechanical Keyboard TKL",
        description: "Tenkeyless mechanical keyboard with RGB backlighting",
        price: 7499,
        sku: "KB-TKL-002",
        imageUrl: "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: '27" 4K Monitor',
        description: "IPS panel with 144Hz refresh rate and USB-C",
        price: 34999,
        sku: "MON-4K-003",
        imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a573d5f5a5?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Ergonomic Office Chair",
        description: "Lumbar support, adjustable armrests, mesh back",
        price: 18999,
        sku: "CHAIR-ERG-004",
        imageUrl: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "USB-C Hub 10-in-1",
        description: "HDMI, SD card, USB-A, Ethernet, PD charging",
        price: 3499,
        sku: "HUB-10-005",
        imageUrl: "https://images.unsplash.com/photo-1625920952879-8a0b42ab9438?w=400",
      },
    }),
  ]);

  for (const product of products) {
    for (const warehouse of [mumbai, delhi, bangalore]) {
      const total = Math.floor(Math.random() * 15) + 2;
      await prisma.stock.create({
        data: { productId: product.id, warehouseId: warehouse.id, total, reserved: 0 },
      });
    }
  }

  // Set one to low stock for demo
  await prisma.stock.updateMany({
    where: {
      product: { sku: "MON-4K-003" },
      warehouse: { name: "Mumbai Central" },
    },
    data: { total: 2 },
  });

  console.log("✅ Seeded: 3 warehouses, 5 products, stock per warehouse");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
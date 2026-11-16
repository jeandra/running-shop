import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const baseProduct = {
  name: 'Sepatu Uji',
  slug: 'sepatu-uji',
  brand: 'TestBrand',
  gender: 'unisex',
  description: 'Sepatu untuk test',
  price: 899000,
  category: {
    create: { name: 'Daily trainer', slug: 'daily-trainer' },
  },
};

beforeEach(async () => {
  await prisma.stockMovement.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

it('menolak dua varian dengan produk dan ukuran sama', async () => {
  const product = await prisma.product.create({ data: baseProduct });
  await prisma.productVariant.create({
    data: { productId: product.id, sizeEu: 42, sku: 'A-42', stock: 3 },
  });

  await expect(
    prisma.productVariant.create({
      data: { productId: product.id, sizeEu: 42, sku: 'B-42', stock: 1 },
    }),
  ).rejects.toMatchObject({ code: 'P2002' });
});

it('menyimpan harga sebagai integer rupiah tanpa pembulatan', async () => {
  const created = await prisma.product.create({ data: baseProduct });

  const found = await prisma.product.findUniqueOrThrow({
    where: { id: created.id },
  });

  expect(found.price).toBe(899000);
});

it('menolak email yang sama persis', async () => {
  await prisma.user.create({
    data: { name: 'A', email: 'a@mail.com', passwordHash: 'x' },
  });

  await expect(
    prisma.user.create({
      data: { name: 'B', email: 'a@mail.com', passwordHash: 'x' },
    }),
  ).rejects.toMatchObject({ code: 'P2002' });
});

it('stok hanya ada di varian dan default nol', async () => {
  const product = await prisma.product.create({ data: baseProduct });
  const variant = await prisma.productVariant.create({
    data: { productId: product.id, sizeEu: 44, sku: 'C-44' },
  });

  expect(variant.stock).toBe(0);
  expect(Object.keys(product)).not.toContain('stock');
});

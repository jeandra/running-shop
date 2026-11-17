import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { seedDatabase } from '../prisma/seed';
import { resetDb } from './reset-db';

const prisma = new PrismaClient();

beforeEach(async () => {
  await resetDb(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

it('seed dapat dijalankan dua kali tanpa duplikat', async () => {
  await seedDatabase(prisma);
  await seedDatabase(prisma);

  expect(await prisma.user.count()).toBe(2);
  expect(await prisma.category.count()).toBe(4);
});

it('admin tersimpan dengan hash, bukan password mentah', async () => {
  await seedDatabase(prisma);

  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: 'admin@toko.test' },
  });

  expect(admin.passwordHash).not.toBe('Password123!');
  expect(await argon2.verify(admin.passwordHash, 'Password123!')).toBe(true);
});

it('seed membuat 24-32 produk dengan 7 varian tiap produk', async () => {
  await seedDatabase(prisma);

  const products = await prisma.product.count();
  expect(products).toBeGreaterThanOrEqual(24);
  expect(products).toBeLessThanOrEqual(32);
  expect(await prisma.productVariant.count()).toBe(products * 7);
  expect(
    await prisma.product.count({ where: { variants: { every: { stock: 0 } } } }),
  ).toBe(1);
});

it('seed dua kali tidak menggandakan produk atau varian', async () => {
  await seedDatabase(prisma);
  const first = {
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
  };

  await seedDatabase(prisma);

  expect(await prisma.product.count()).toBe(first.products);
  expect(await prisma.productVariant.count()).toBe(first.variants);
});

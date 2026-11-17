import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { makeProduct, makeVariant } from './catalog-fixtures';
import { createTestApp } from './create-app';
import { resetDb } from './reset-db';

const prisma = new PrismaClient();
let app: INestApplication;

beforeEach(async () => {
  await resetDb(prisma);
  app = await createTestApp();
});

afterEach(async () => {
  await app.close();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const get = (query = '') =>
  request(app.getHttpServer()).get(`/products${query}`);

it('menampilkan 12 produk aktif per halaman, urut terbaru', async () => {
  for (let i = 0; i < 13; i++) {
    await makeProduct(prisma, {
      name: `Test Produk ${i}`,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)),
    });
  }
  const inactive = await makeProduct(prisma, {
    name: 'Test Nonaktif',
    isActive: false,
  });

  const res = await get().expect(200);

  expect(res.body.total).toBe(13);
  expect(res.body.totalPages).toBe(2);
  expect(res.body.items).toHaveLength(12);
  expect(res.body.items[0].name).toBe('Test Produk 12');
  expect(JSON.stringify(res.body)).not.toContain(inactive.slug);
});

it('halaman kedua berisi sisa produk', async () => {
  for (let i = 0; i < 13; i++) {
    await makeProduct(prisma, {
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)),
    });
  }

  const res = await get('?page=2').expect(200);

  expect(res.body.page).toBe(2);
  expect(res.body.items).toHaveLength(1);
});

it('pencarian sebagian tidak peka huruf besar', async () => {
  await makeProduct(prisma, { name: 'Test Pegasus 41' });
  await makeProduct(prisma, { name: 'Test Ghost 16' });

  expect((await get('?search=pegasus').expect(200)).body.total).toBe(1);
  expect((await get('?search=PEGASUS').expect(200)).body.total).toBe(1);
});

it('search kosong sama dengan tanpa filter', async () => {
  await makeProduct(prisma);
  await makeProduct(prisma);

  expect((await get('?search=').expect(200)).body.total).toBe(2);
});

it('tanda % dan _ dicari sebagai huruf biasa', async () => {
  await makeProduct(prisma, { name: 'Test 100% Cushion' });
  await makeProduct(prisma, { name: 'Test 100x Cushion' });
  await makeProduct(prisma, { name: 'Test A_B' });
  await makeProduct(prisma, { name: 'Test AXB' });

  expect((await get('?search=100%25').expect(200)).body.total).toBe(1);
  expect((await get('?search=A_B').expect(200)).body.total).toBe(1);
});

it('mengurutkan harga naik dan turun', async () => {
  await makeProduct(prisma, { price: 300_000 });
  await makeProduct(prisma, { price: 100_000 });
  await makeProduct(prisma, { price: 200_000 });

  const prices = (body: { items: { price: number }[] }) =>
    body.items.map((item) => item.price);

  expect(prices((await get('?sort=price_asc').expect(200)).body)).toEqual([
    100_000, 200_000, 300_000,
  ]);
  expect(prices((await get('?sort=price_desc').expect(200)).body)).toEqual([
    300_000, 200_000, 100_000,
  ]);
});

it.each([
  '?limit=100',
  '?page=0',
  '?page=abc',
  '?page=99999999999999999999',
  '?sort=ngawur',
])('menolak query %s dengan 400', async (query) => {
  const res = await get(query).expect(400);

  expect(res.body.statusCode).toBe(400);
});

it('halaman melewati total mengembalikan daftar kosong', async () => {
  await makeProduct(prisma);

  const res = await get('?page=99').expect(200);

  expect(res.body.items).toEqual([]);
  expect(res.body.total).toBe(1);
});

it('stockTotal hanya menjumlah varian aktif', async () => {
  const product = await makeProduct(prisma);
  await makeVariant(prisma, product.id, 42, 5, true);
  await makeVariant(prisma, product.id, 43, 7, false);
  const tanpaVarian = await makeProduct(prisma);

  const res = await get().expect(200);
  const item = (slug: string) =>
    res.body.items.find((entry: { slug: string }) => entry.slug === slug);

  expect(item(product.slug).stockTotal).toBe(5);
  expect(item(tanpaVarian.slug).stockTotal).toBe(0);
});

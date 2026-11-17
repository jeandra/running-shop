import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { makeCategory, makeProduct, makeVariant } from './catalog-fixtures';
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

const detail = (slug: string) =>
  request(app.getHttpServer()).get(`/products/${slug}`);

it('memuat varian aktif urut ukuran', async () => {
  const product = await makeProduct(prisma);
  await makeVariant(prisma, product.id, 42, 3);
  await makeVariant(prisma, product.id, 40, 1);
  await makeVariant(prisma, product.id, 39, 2);
  await makeVariant(prisma, product.id, 41, 9, false);

  const res = await detail(product.slug).expect(200);

  expect(res.body.variants.map((v: { sizeEu: number }) => v.sizeEu)).toEqual([
    39, 40, 42,
  ]);
  expect(res.body.variants[0].stock).toBe(2);
});

it('memuat spesifikasi dan kategori', async () => {
  const category = await makeCategory(prisma);
  const product = await makeProduct(prisma, {
    categoryId: category.id,
    weightGram: 250,
    dropMm: 8,
    terrain: 'road',
  });

  const res = await detail(product.slug).expect(200);

  expect(res.body).toMatchObject({
    weightGram: 250,
    dropMm: 8,
    terrain: 'road',
    category: { slug: 'test-cat' },
  });
});

it('slug tidak dikenal dijawab 404', async () => {
  const res = await detail('tidak-ada').expect(404);

  expect(res.body.statusCode).toBe(404);
});

it('produk nonaktif dijawab 404', async () => {
  const product = await makeProduct(prisma, { isActive: false });

  await detail(product.slug).expect(404);
});

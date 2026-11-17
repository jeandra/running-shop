import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { adminToken } from './auth-helpers';
import { makeCategory } from './catalog-fixtures';
import { createTestApp } from './create-app';
import { resetDb } from './reset-db';

const prisma = new PrismaClient();
let app: INestApplication;
let auth: string;

beforeEach(async () => {
  await resetDb(prisma);
  app = await createTestApp();
  auth = `Bearer ${await adminToken(app)}`;
});

afterEach(async () => {
  await app.close();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const api = () => request(app.getHttpServer());

async function createProduct(): Promise<{ id: string; slug: string }> {
  const category = await makeCategory(prisma);

  const res = await api()
    .post('/admin/products')
    .set('Authorization', auth)
    .send({
      categoryId: category.id,
      name: 'Test Produk Varian',
      brand: 'Test',
      gender: 'unisex',
      description: 'Deskripsi uji',
      price: 500_000,
    })
    .expect(201);

  return { id: res.body.id as string, slug: res.body.slug as string };
}

it('membuat varian dengan SKU bawaan dari slug dan ukuran', async () => {
  const product = await createProduct();

  const res = await api()
    .post(`/admin/products/${product.id}/variants`)
    .set('Authorization', auth)
    .send({ sizeEu: 42, stock: 3 })
    .expect(201);

  expect(res.body).toMatchObject({
    sizeEu: 42,
    stock: 3,
    isActive: true,
    sku: `${product.slug}-42`,
  });
});

it('menolak ukuran ganda dan SKU yang sudah dipakai', async () => {
  const product = await createProduct();
  const other = await createProduct();

  await api()
    .post(`/admin/products/${product.id}/variants`)
    .set('Authorization', auth)
    .send({ sizeEu: 42, stock: 3 })
    .expect(201);
  await api()
    .post(`/admin/products/${product.id}/variants`)
    .set('Authorization', auth)
    .send({ sizeEu: 42, stock: 1 })
    .expect(409);

  const sku = 'SKU-BERSAMA';
  await api()
    .post(`/admin/products/${product.id}/variants`)
    .set('Authorization', auth)
    .send({ sizeEu: 43, stock: 1, sku })
    .expect(201);
  await api()
    .post(`/admin/products/${other.id}/variants`)
    .set('Authorization', auth)
    .send({ sizeEu: 43, stock: 1, sku })
    .expect(409);
});

it('menolak stok negatif, ukuran di luar 39-45, dan field asing', async () => {
  const product = await createProduct();
  const url = `/admin/products/${product.id}/variants`;

  await api()
    .post(url)
    .set('Authorization', auth)
    .send({ sizeEu: 42, stock: -1 })
    .expect(400);
  await api()
    .post(url)
    .set('Authorization', auth)
    .send({ sizeEu: 50, stock: 1 })
    .expect(400);
  await api()
    .post(url)
    .set('Authorization', auth)
    .send({ sizeEu: 38, stock: 1 })
    .expect(400);
  await api()
    .post(url)
    .set('Authorization', auth)
    .send({ sizeEu: 42, stock: 1, harga: 1000 })
    .expect(400);
});

it('mengubah stok terlihat di detail publik', async () => {
  const product = await createProduct();
  const created = await api()
    .post(`/admin/products/${product.id}/variants`)
    .set('Authorization', auth)
    .send({ sizeEu: 42, stock: 3 })
    .expect(201);

  await api()
    .patch(`/admin/variants/${created.body.id}`)
    .set('Authorization', auth)
    .send({ stock: 9 })
    .expect(200);

  const detail = await api().get(`/products/${product.slug}`).expect(200);
  expect(detail.body.variants[0].stock).toBe(9);
});

it('mengubah ukuran tidak menulis ulang SKU', async () => {
  const product = await createProduct();
  const created = await api()
    .post(`/admin/products/${product.id}/variants`)
    .set('Authorization', auth)
    .send({ sizeEu: 42, stock: 3 })
    .expect(201);

  const updated = await api()
    .patch(`/admin/variants/${created.body.id}`)
    .set('Authorization', auth)
    .send({ sizeEu: 43 })
    .expect(200);

  expect(updated.body.sizeEu).toBe(43);
  expect(updated.body.sku).toBe(`${product.slug}-42`);
});

it('delete menyembunyikan varian dari publik tapi menyisakan baris', async () => {
  const product = await createProduct();
  const created = await api()
    .post(`/admin/products/${product.id}/variants`)
    .set('Authorization', auth)
    .send({ sizeEu: 42, stock: 3 })
    .expect(201);

  await api()
    .delete(`/admin/variants/${created.body.id}`)
    .set('Authorization', auth)
    .expect(204);

  const publicDetail = await api().get(`/products/${product.slug}`).expect(200);
  expect(publicDetail.body.variants).toEqual([]);

  const adminDetail = await api()
    .get(`/admin/products/${product.id}`)
    .set('Authorization', auth)
    .expect(200);
  expect(adminDetail.body.variants[0]).toMatchObject({
    id: created.body.id,
    isActive: false,
  });
});

it('delete varian yang dipakai keranjang tetap 204', async () => {
  const product = await createProduct();
  const created = await api()
    .post(`/admin/products/${product.id}/variants`)
    .set('Authorization', auth)
    .send({ sizeEu: 42, stock: 3 })
    .expect(201);

  const user = await prisma.user.create({
    data: {
      name: 'Pembeli',
      email: 'pembeli@test.local',
      passwordHash: 'x',
    },
  });
  const cart = await prisma.cart.create({ data: { userId: user.id } });
  await prisma.cartItem.create({
    data: { cartId: cart.id, variantId: created.body.id, qty: 1 },
  });

  await api()
    .delete(`/admin/variants/${created.body.id}`)
    .set('Authorization', auth)
    .expect(204);
});

it('produk atau varian tak dikenal dijawab 404', async () => {
  await api()
    .post('/admin/products/tidak-ada/variants')
    .set('Authorization', auth)
    .send({ sizeEu: 42, stock: 1 })
    .expect(404);
  await api()
    .patch('/admin/variants/tidak-ada')
    .set('Authorization', auth)
    .send({ stock: 1 })
    .expect(404);
});

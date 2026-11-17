import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { adminToken, customerToken } from './auth-helpers';
import { makeProduct } from './catalog-fixtures';
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

it('membuat kategori dengan slug otomatis dan menolak nama kembar', async () => {
  const created = await api()
    .post('/admin/categories')
    .set('Authorization', auth)
    .send({ name: 'Trail Sepatu' })
    .expect(201);

  expect(created.body.slug).toBe('trail-sepatu');

  await api()
    .post('/admin/categories')
    .set('Authorization', auth)
    .send({ name: 'Trail Sepatu' })
    .expect(409);
});

it('rename kategori tidak mengubah slug', async () => {
  const created = await api()
    .post('/admin/categories')
    .set('Authorization', auth)
    .send({ name: 'Trail Sepatu' })
    .expect(201);

  const renamed = await api()
    .patch(`/admin/categories/${created.body.id}`)
    .set('Authorization', auth)
    .send({ name: 'Nama Baru' })
    .expect(200);

  expect(renamed.body.name).toBe('Nama Baru');
  expect(renamed.body.slug).toBe('trail-sepatu');
});

it('daftar kategori menghitung produk nonaktif juga', async () => {
  const created = await api()
    .post('/admin/categories')
    .set('Authorization', auth)
    .send({ name: 'Kategori Uji' })
    .expect(201);

  await makeProduct(prisma, { categoryId: created.body.id });
  await makeProduct(prisma, { categoryId: created.body.id, isActive: false });

  const list = await api()
    .get('/admin/categories')
    .set('Authorization', auth)
    .expect(200);

  const found = list.body.find(
    (entry: { id: string }) => entry.id === created.body.id,
  );
  expect(found.productCount).toBe(2);
});

it('menolak hapus kategori yang masih punya produk', async () => {
  const created = await api()
    .post('/admin/categories')
    .set('Authorization', auth)
    .send({ name: 'Kategori Uji' })
    .expect(201);

  await makeProduct(prisma, {
    categoryId: created.body.id,
    isActive: false,
  });

  await api()
    .delete(`/admin/categories/${created.body.id}`)
    .set('Authorization', auth)
    .expect(409);
});

it('hapus kategori berhasil setelah produk dipindah', async () => {
  const source = await api()
    .post('/admin/categories')
    .set('Authorization', auth)
    .send({ name: 'Kategori Asal' })
    .expect(201);
  const target = await api()
    .post('/admin/categories')
    .set('Authorization', auth)
    .send({ name: 'Kategori Tujuan' })
    .expect(201);

  const product = await makeProduct(prisma, { categoryId: source.body.id });

  await api()
    .patch(`/admin/products/${product.id}`)
    .set('Authorization', auth)
    .send({ categoryId: target.body.id })
    .expect(200);

  await api()
    .delete(`/admin/categories/${source.body.id}`)
    .set('Authorization', auth)
    .expect(204);
});

it('tanpa token 401 dan customer 403', async () => {
  await api().get('/admin/categories').expect(401);
  const customer = await customerToken(app);
  await api()
    .get('/admin/categories')
    .set('Authorization', `Bearer ${customer}`)
    .expect(403);
});

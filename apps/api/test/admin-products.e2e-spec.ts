import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { adminToken, customerToken } from './auth-helpers';
import { makeCategory, makeVariant } from './catalog-fixtures';
import { createTestApp } from './create-app';
import { resetDb } from './reset-db';

const prisma = new PrismaClient();
let app: INestApplication;
let token: string;

beforeEach(async () => {
  await resetDb(prisma);
  app = await createTestApp();
  token = await adminToken(app);
});

afterEach(async () => {
  await app.close();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const api = () => request(app.getHttpServer());

const payload = () => ({
  name: 'Test Produk Uji',
  brand: 'Test',
  gender: 'unisex',
  description: 'Deskripsi uji',
  price: 899_000,
  weightGram: 250,
  dropMm: 8,
  stackMm: 32,
  cushioning: 'sedang',
  support: 'netral',
  terrain: 'road',
});

const createWithCategory = async () => {
  const category = await makeCategory(prisma);
  return { categoryId: category.id, ...payload() };
};

it('tanpa token dijawab 401', async () => {
  await api().get('/admin/products').expect(401);
});

it('token customer dijawab 403', async () => {
  const customer = await customerToken(app);

  await api()
    .get('/admin/products')
    .set('Authorization', `Bearer ${customer}`)
    .expect(403);
});

it('create mengembalikan bentuk yang sama dengan detail admin', async () => {
  const body = await createWithCategory();

  const created = await api()
    .post('/admin/products')
    .set('Authorization', `Bearer ${token}`)
    .send(body)
    .expect(201);

  expect(created.body.slug).toBe('test-produk-uji');
  expect(created.body.variants).toEqual([]);

  const detail = await api()
    .get(`/admin/products/${created.body.id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  expect(detail.body).toEqual(created.body);
});

it('nama sama menghasilkan slug berakhiran -2', async () => {
  const body = await createWithCategory();

  const first = await api()
    .post('/admin/products')
    .set('Authorization', `Bearer ${token}`)
    .send(body)
    .expect(201);
  const second = await api()
    .post('/admin/products')
    .set('Authorization', `Bearer ${token}`)
    .send(body)
    .expect(201);

  expect(first.body.slug).toBe('test-produk-uji');
  expect(second.body.slug).toBe('test-produk-uji-2');
});

it('nama berkarakter aneh menghasilkan slug bersih', async () => {
  const body = await createWithCategory();

  const created = await api()
    .post('/admin/products')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...body, name: '  Sepatu  Trail 🏃  ' })
    .expect(201);

  expect(created.body.slug).toBe('sepatu-trail');
  await api().get('/products/sepatu-trail').expect(200);
});

it('menolak harga 0, field asing, dan kategori asing', async () => {
  const body = await createWithCategory();

  await api()
    .post('/admin/products')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...body, price: 0 })
    .expect(400);
  await api()
    .post('/admin/products')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...body, role: 'ADMIN' })
    .expect(400);
  await api()
    .post('/admin/products')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...body, categoryId: 'tidak-ada' })
    .expect(400);
});

it('rename tidak mengubah slug', async () => {
  const created = await api()
    .post('/admin/products')
    .set('Authorization', `Bearer ${token}`)
    .send(await createWithCategory())
    .expect(201);

  const renamed = await api()
    .patch(`/admin/products/${created.body.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Nama Baru' })
    .expect(200);

  expect(renamed.body.name).toBe('Nama Baru');
  expect(renamed.body.slug).toBe(created.body.slug);
});

it('delete menyembunyikan dari publik tapi menyisakan baris', async () => {
  const created = await api()
    .post('/admin/products')
    .set('Authorization', `Bearer ${token}`)
    .send(await createWithCategory())
    .expect(201);

  await api()
    .delete(`/admin/products/${created.body.id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(204);

  const list = await api().get('/products').expect(200);
  expect(JSON.stringify(list.body)).not.toContain(created.body.slug);
  await api().get(`/products/${created.body.slug}`).expect(404);

  const row = await prisma.product.findUniqueOrThrow({
    where: { id: created.body.id },
  });
  expect(row.isActive).toBe(false);
});

it('delete produk menonaktifkan juga variannya', async () => {
  const created = await api()
    .post('/admin/products')
    .set('Authorization', `Bearer ${token}`)
    .send(await createWithCategory())
    .expect(201);

  await makeVariant(prisma, created.body.id, 42, 3, true);

  await api()
    .delete(`/admin/products/${created.body.id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(204);

  const adminDetail = await api()
    .get(`/admin/products/${created.body.id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  expect(adminDetail.body.variants[0].isActive).toBe(false);
});

it('PATCH isActive true menghidupkan kembali produk', async () => {
  const created = await api()
    .post('/admin/products')
    .set('Authorization', `Bearer ${token}`)
    .send(await createWithCategory())
    .expect(201);

  await api()
    .delete(`/admin/products/${created.body.id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(204);
  await api()
    .patch(`/admin/products/${created.body.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ isActive: true })
    .expect(200);

  await api().get(`/products/${created.body.slug}`).expect(200);
});

it('detail admin memuat varian nonaktif, detail publik tidak', async () => {
  const created = await api()
    .post('/admin/products')
    .set('Authorization', `Bearer ${token}`)
    .send(await createWithCategory())
    .expect(201);

  await makeVariant(prisma, created.body.id, 42, 3, true);
  await makeVariant(prisma, created.body.id, 43, 0, false);

  const adminDetail = await api()
    .get(`/admin/products/${created.body.id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  expect(adminDetail.body.variants).toHaveLength(2);

  const publicDetail = await api()
    .get(`/products/${created.body.slug}`)
    .expect(200);
  expect(publicDetail.body.variants).toHaveLength(1);
});

it('includeInactive menyertakan produk nonaktif', async () => {
  const created = await api()
    .post('/admin/products')
    .set('Authorization', `Bearer ${token}`)
    .send(await createWithCategory())
    .expect(201);
  await api()
    .delete(`/admin/products/${created.body.id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(204);

  const hidden = await api()
    .get('/admin/products')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  const shown = await api()
    .get('/admin/products?includeInactive=true')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  expect(hidden.body.total).toBe(0);
  expect(shown.body.total).toBe(1);
  expect(shown.body.items[0].isActive).toBe(false);
});

it('page bukan angka dijawab 400', async () => {
  await api()
    .get('/admin/products?page=abc')
    .set('Authorization', `Bearer ${token}`)
    .expect(400);
});

it('menolak null pada field wajib, menerima null untuk field opsional', async () => {
  const created = await api()
    .post('/admin/products')
    .set('Authorization', `Bearer ${token}`)
    .send(await createWithCategory())
    .expect(201);
  const url = `/admin/products/${created.body.id}`;

  await api()
    .patch(url)
    .set('Authorization', `Bearer ${token}`)
    .send({ price: null })
    .expect(400);
  await api()
    .patch(url)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: null })
    .expect(400);
  await api()
    .patch(url)
    .set('Authorization', `Bearer ${token}`)
    .send({ isActive: null })
    .expect(400);

  const cleared = await api()
    .patch(url)
    .set('Authorization', `Bearer ${token}`)
    .send({ image: null })
    .expect(200);
  expect(cleared.body.image).toBeNull();
});

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

describe('Orders (e2e) — riwayat & batal', () => {
  it('GET /orders mengembalikan daftar pesanan user', async () => {
    const product = await makeProduct(prisma, { name: 'Test Orders Product' });
    const variant = await makeVariant(prisma, product.id, 42, 5);

    const email = `orders-list-${Date.now()}@test.local`;
    const password = 'Password123!';
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Orders User', email, password })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const token = login.body.accessToken as string;

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ variantId: variant.id, quantity: 1 })
      .expect(201);
    const checkout = await request(app.getHttpServer())
      .post('/orders/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(201);
    const orderId = checkout.body.order.id;

    const res = await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(orderId);
  });

  it('GET /orders/:id mengembalikan detail pesanan sendiri', async () => {
    const product = await makeProduct(prisma, { name: 'Test Orders Detail Product' });
    const variant = await makeVariant(prisma, product.id, 42, 5);

    const email = `orders-detail-${Date.now()}@test.local`;
    const password = 'Password123!';
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Orders Detail User', email, password })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const token = login.body.accessToken as string;

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ variantId: variant.id, quantity: 1 })
      .expect(201);
    const checkout = await request(app.getHttpServer())
      .post('/orders/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(201);
    const orderId = checkout.body.order.id;

    const res = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.id).toBe(orderId);
    expect(res.body.status).toBe('PENDING_PAYMENT');
  });

  it('POST /orders/:id/cancel membatalkan pesanan belum dibayar dan mengembalikan stok', async () => {
    const product = await makeProduct(prisma, { name: 'Test Orders Cancel Product' });
    const variant = await makeVariant(prisma, product.id, 42, 5);

    const email = `orders-cancel-${Date.now()}@test.local`;
    const password = 'Password123!';
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Orders Cancel User', email, password })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const token = login.body.accessToken as string;

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ variantId: variant.id, quantity: 2 })
      .expect(201);
    const checkout = await request(app.getHttpServer())
      .post('/orders/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(201);
    const orderId = checkout.body.order.id;

    const cancel = await request(app.getHttpServer())
      .post(`/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(201);

    expect(cancel.body.status).toBe('CANCELLED');
    const variantAfter = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
    expect(variantAfter.stock).toBe(5);
  });
});

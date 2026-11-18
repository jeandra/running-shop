import { INestApplication } from '@nestjs/common';
import { PrismaClient, Role } from '@prisma/client';
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

describe('Admin Orders (e2e)', () => {
  it('admin GET /admin/orders mengembalikan daftar pesanan', async () => {
    const product = await makeProduct(prisma, { name: 'Test Admin Orders Product' });
    const variant = await makeVariant(prisma, product.id, 42, 5);

    const email = `admin-orders-${Date.now()}@test.local`;
    const password = 'Password123!';
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Admin Orders User', email, password })
      .expect(201);
    await prisma.user.update({ where: { email }, data: { role: Role.ADMIN } });
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
      .get('/admin/orders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(orderId);
  });

  it('admin PATCH /admin/orders/:id memperbarui status dan nomor resi', async () => {
    const product = await makeProduct(prisma, { name: 'Test Admin Orders Product 2' });
    const variant = await makeVariant(prisma, product.id, 42, 5);

    const email = `admin-orders-${Date.now()}-2@test.local`;
    const password = 'Password123!';
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Admin Orders User 2', email, password })
      .expect(201);
    await prisma.user.update({ where: { email }, data: { role: Role.ADMIN } });
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
      .patch(`/admin/orders/${orderId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'PAID', trackingNumber: 'TRK-123' })
      .expect(200);

    expect(res.body.status).toBe('PAID');
  });
});

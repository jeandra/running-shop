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

describe('Orders (e2e) — status transition', () => {
  it('menolak transisi status ilegal dan menerima transisi valid', async () => {
    const product = await makeProduct(prisma, { name: 'Test Status Product' });
    const variant = await makeVariant(prisma, product.id, 42, 5);

    const email = `status-${Date.now()}@test.local`;
    const password = 'Password123!';
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Status Admin', email, password })
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

    await request(app.getHttpServer())
      .patch(`/admin/orders/${orderId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'SHIPPED' })
      .expect(409);

    const res = await request(app.getHttpServer())
      .patch(`/admin/orders/${orderId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'PAID' })
      .expect(200);

    expect(res.body.status).toBe('PAID');
  });
});

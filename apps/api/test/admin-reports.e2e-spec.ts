import { INestApplication } from '@nestjs/common';
import { PrismaClient, Role } from '@prisma/client';
import { createHmac } from 'crypto';
import request from 'supertest';
import { makeProduct, makeVariant } from './catalog-fixtures';
import { createTestApp } from './create-app';
import { resetDb } from './reset-db';

const prisma = new PrismaClient();
let app: INestApplication;

beforeEach(async () => {
  process.env.MIDTRANS_WEBHOOK_SECRET = 'test-midtrans-webhook-secret';
  await resetDb(prisma);
  app = await createTestApp();
});

afterEach(async () => {
  await app.close();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Admin Reports (e2e)', () => {
  it('GET /admin/reports/summary mengembalikan ringkasan penjualan', async () => {
    const product = await makeProduct(prisma, { name: 'Test Reports Product' });
    const variant = await makeVariant(prisma, product.id, 42, 5);

    const email = `admin-reports-${Date.now()}@test.local`;
    const password = 'Password123!';
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Admin Reports User', email, password })
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
    const secret = 'test-midtrans-webhook-secret';
    const payload = { event_id: `evt-${orderId}`, transaction: { status: 'payment_finish' }, order_id: orderId };
    const signature = createHmac('sha512', secret).update(JSON.stringify(payload)).digest('hex');
    await request(app.getHttpServer())
      .post('/payments/webhook')
      .send(payload)
      .set('x-midtrans-signature', signature)
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/admin/reports/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.totalRevenue).toBe(checkout.body.order.total);
    expect(res.body.totalOrders).toBe(1);
    expect(Array.isArray(res.body.topProducts)).toBe(true);
    expect(res.body.topProducts[0]).toMatchObject({ productId: product.id, qty: 1 });
  });
});

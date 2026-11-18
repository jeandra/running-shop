import { createHmac } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { makeProduct, makeVariant } from './catalog-fixtures';
import { createTestApp } from './create-app';
import { resetDb } from './reset-db';
import { OrdersService } from '../src/orders/orders.service';

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

describe('Orders (e2e) — expiry', () => {
  it('auto-cancel pesanan PENDING_PAYMENT yang expired dan kembalikan stok', async () => {
    const product = await makeProduct(prisma, { name: 'Test Expiry Product' });
    const variant = await makeVariant(prisma, product.id, 42, 5);

    const email = `expiry-${Date.now()}@test.local`;
    const password = 'Password123!';
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Expiry User', email, password })
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

    await prisma.order.update({
      where: { id: orderId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const ordersService = app.get(OrdersService);
    const result = await ordersService.expireDueOrders();

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe('CANCELLED');
    expect(result.cancelled).toBe(1);

    const variantAfter = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(variantAfter.stock).toBe(5);
  });

  it('pesanan expired tidak bisa dibayar via webhook (tetap CANCELLED)', async () => {
    const product = await makeProduct(prisma, { name: 'Test Expiry Webhook Product' });
    const variant = await makeVariant(prisma, product.id, 42, 5);

    const email = `expiry-wh-${Date.now()}@test.local`;
    const password = 'Password123!';
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Expiry WH User', email, password })
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

    await prisma.order.update({
      where: { id: orderId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const ordersService = app.get(OrdersService);
    await ordersService.expireDueOrders();

    const secret = 'test-midtrans-webhook-secret';
    const payload = { event_id: `evt-${orderId}`, transaction: { status: 'payment_finish' }, order_id: orderId };
    const signature = createHmac('sha512', secret).update(JSON.stringify(payload)).digest('hex');
    await request(app.getHttpServer())
      .post('/payments/webhook')
      .send(payload)
      .set('x-midtrans-signature', signature)
      .expect(201);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe('CANCELLED');
  });
});

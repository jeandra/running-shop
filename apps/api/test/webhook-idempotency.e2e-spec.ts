import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createHmac } from 'crypto';
import request from 'supertest';
import { makeProduct, makeVariant } from './catalog-fixtures';
import { createTestApp } from './create-app';
import { resetDb } from './reset-db';
import { NotificationsService } from '../src/notifications/notifications.service';

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

describe('Payments (e2e) — webhook idempotency', () => {
  it('webhook PAID dikirim 3x: order PAID, email 1x, stok tetap', async () => {
    const product = await makeProduct(prisma, { name: 'Test Webhook Idempotency Product' });
    const variant = await makeVariant(prisma, product.id, 42, 5);

    const email = `wh-${Date.now()}@test.local`;
    const password = 'Password123!';
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Webhook User', email, password })
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
    const notifications = app.get(NotificationsService);
    const sendSpy = jest.spyOn(notifications, 'sendEmail');

    const secret = 'test-midtrans-webhook-secret';
    for (let i = 0; i < 3; i++) {
      const payload = { event_id: `evt-${orderId}-${i}`, transaction: { status: 'payment_finish' }, order_id: orderId };
      const signature = createHmac('sha512', secret).update(JSON.stringify(payload)).digest('hex');
      await request(app.getHttpServer())
        .post('/payments/webhook')
        .send(payload)
        .set('x-midtrans-signature', signature)
        .expect(201);
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe('PAID');
    expect(sendSpy).toHaveBeenCalledTimes(1);

    const variantAfter = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
    expect(variantAfter.stock).toBe(4);
  });
});

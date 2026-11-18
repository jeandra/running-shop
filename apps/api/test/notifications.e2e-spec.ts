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

describe('Notifications (e2e) — email', () => {
  it('mengirim email konfirmasi saat checkout dan email sukses saat webhook PAID', async () => {
    const product = await makeProduct(prisma, { name: 'Test Notify Product' });
    const variant = await makeVariant(prisma, product.id, 42, 5);

    const email = `notify-${Date.now()}@test.local`;
    const password = 'Password123!';
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Notify User', email, password })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const token = login.body.accessToken as string;

    const notifications = app.get(NotificationsService);
    const sendSpy = jest.spyOn(notifications, 'sendEmail');

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

    const res = await request(app.getHttpServer())
      .post('/payments/webhook')
      .send(payload)
      .set('x-midtrans-signature', signature)
      .expect(201);

    expect(res.body).toEqual({ processed: true });
    expect(sendSpy).toHaveBeenCalledTimes(2);
    expect(sendSpy).toHaveBeenLastCalledWith(expect.objectContaining({ to: email }));
  });
});

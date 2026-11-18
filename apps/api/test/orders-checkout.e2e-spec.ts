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

describe('Orders (e2e) — checkout', () => {
  it('checkout membuat pesanan PENDING_PAYMENT dari keranjang dan mengurangi stok', async () => {
    const product = await makeProduct(prisma, { name: 'Test Checkout Product' });
    const variant = await makeVariant(prisma, product.id, 42, 5);

    const email = `checkout-${Date.now()}@test.local`;
    const password = 'Password123!';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Checkout User', email, password })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const token = login.body.accessToken as string;

    const add = await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ variantId: variant.id, quantity: 2 })
      .expect(201);
    expect(add.body.totalItems).toBe(2);

    const res = await request(app.getHttpServer())
      .post('/orders/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(201);

    expect(res.body.order.status).toBe('PENDING_PAYMENT');
    expect(res.body.order.items).toHaveLength(1);
    expect(res.body.order.items[0].qty).toBe(2);

    const variantAfter = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(variantAfter.stock).toBe(3);
  });
});

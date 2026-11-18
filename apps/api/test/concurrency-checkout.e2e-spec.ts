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

describe('Orders (e2e) — concurrency checkout', () => {
  it('dua checkout bersamaan untuk 1 stok: satu sukses, satu gagal, stok tidak negatif', async () => {
    const product = await makeProduct(prisma, { name: 'Test Concurrency Product' });
    const variant = await makeVariant(prisma, product.id, 42, 1);

    const makeUser = async (suffix: string) => {
      const email = `conc-${suffix}-${Date.now()}@test.local`;
      const password = 'Password123!';
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: `Conc User ${suffix}`, email, password })
        .expect(201);
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);
      return { token: login.body.accessToken as string };
    };

    const userA = await makeUser('a');
    const userB = await makeUser('b');

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ variantId: variant.id, quantity: 1 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ variantId: variant.id, quantity: 1 })
      .expect(201);

    const results = await Promise.all([
      request(app.getHttpServer()).post('/orders/checkout').set('Authorization', `Bearer ${userA.token}`).send({}),
      request(app.getHttpServer()).post('/orders/checkout').set('Authorization', `Bearer ${userB.token}`).send({}),
    ]);

    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409]);

    const variantAfter = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
    expect(variantAfter.stock).toBe(0);
  });
});

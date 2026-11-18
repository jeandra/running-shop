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

describe('Cart (e2e)', () => {
  it('guest membuat keranjang baru lewat cookie session', async () => {
    const res = await request(app.getHttpServer())
      .get('/cart')
      .set('Cookie', 'cart_session=guest-cart-e2e')
      .expect(200);

    expect(res.body.id).toBeDefined();
    expect(res.body.items).toEqual([]);
    expect(res.body.totalItems).toBe(0);
    expect(res.body.subtotal).toBe(0);
  });

  it('guest menambah item ke keranjang', async () => {
    const product = await makeProduct(prisma);
    const variant = await makeVariant(prisma, product.id, 42);

    const res = await request(app.getHttpServer())
      .post('/cart/items')
      .set('Cookie', 'cart_session=guest-cart-e2e')
      .send({ variantId: variant.id, quantity: 2 })
      .expect(201);

    expect(res.body.totalItems).toBe(2);
    expect(res.body.subtotal).toBe(product.price * 2);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].variant.id).toBe(variant.id);
  });

  it('guest mengubah quantity item', async () => {
    const product = await makeProduct(prisma);
    const variant = await makeVariant(prisma, product.id, 42);

    const add = await request(app.getHttpServer())
      .post('/cart/items')
      .set('Cookie', 'cart_session=guest-cart-e2e')
      .send({ variantId: variant.id, quantity: 1 })
      .expect(201);

    const itemId = add.body.items[0].id;

    const res = await request(app.getHttpServer())
      .patch(`/cart/items/${itemId}`)
      .set('Cookie', 'cart_session=guest-cart-e2e')
      .send({ quantity: 3 })
      .expect(200);

    expect(res.body.totalItems).toBe(3);
    expect(res.body.subtotal).toBe(product.price * 3);
  });

  it('guest menghapus item dari keranjang', async () => {
    const product = await makeProduct(prisma);
    const variant = await makeVariant(prisma, product.id, 42);

    const add = await request(app.getHttpServer())
      .post('/cart/items')
      .set('Cookie', 'cart_session=guest-cart-e2e')
      .send({ variantId: variant.id, quantity: 1 })
      .expect(201);

    const itemId = add.body.items[0].id;

    await request(app.getHttpServer())
      .delete(`/cart/items/${itemId}`)
      .set('Cookie', 'cart_session=guest-cart-e2e')
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/cart')
      .set('Cookie', 'cart_session=guest-cart-e2e')
      .expect(200);

    expect(res.body.totalItems).toBe(0);
    expect(res.body.items).toEqual([]);
  });

  it('login menggabungkan keranjang guest ke keranjang user', async () => {
    const product = await makeProduct(prisma);
    const variant = await makeVariant(prisma, product.id, 42);

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Cookie', 'cart_session=guest-cart-e2e')
      .send({ variantId: variant.id, quantity: 1 })
      .expect(201);

    const email = `guest-merge-${Date.now()}@test.local`;
    const password = 'Password123!';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Guest Merge', email, password })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const merged = await request(app.getHttpServer())
      .get('/cart')
      .set('Cookie', 'cart_session=guest-cart-e2e')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(merged.body.totalItems).toBe(1);
    expect(merged.body.items[0].variant.id).toBe(variant.id);
  });
});

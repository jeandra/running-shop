import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from './create-app';
import { resetDb } from './reset-db';

const prisma = new PrismaClient();
let app: INestApplication;

const credentials = {
  name: 'Budi',
  email: 'budi@mail.com',
  password: 'Password123!',
};

beforeEach(async () => {
  app = await createTestApp();
  await resetDb(prisma);
  await request(app.getHttpServer())
    .post('/auth/register')
    .send(credentials)
    .expect(201);
});

afterEach(async () => {
  await app.close();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function login(email = credentials.email): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: credentials.password })
    .expect(200);

  return cookieOf(res);
}

function cookieOf(res: request.Response): string {
  return (res.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
}

it('refresh yang sah mengembalikan access token dan cookie baru', async () => {
  const first = await login();

  const res = await request(app.getHttpServer())
    .post('/auth/refresh')
    .set('Cookie', first)
    .expect(200);

  expect(res.body.accessToken).toBeDefined();
  expect(cookieOf(res)).not.toBe(first);
});

it('token lama tidak berlaku setelah dirotasi', async () => {
  const first = await login();

  await request(app.getHttpServer())
    .post('/auth/refresh')
    .set('Cookie', first)
    .expect(200);

  await request(app.getHttpServer())
    .post('/auth/refresh')
    .set('Cookie', first)
    .expect(401);
});

it('pemakaian ulang token yang sudah dirotasi mencabut semua sesi pengguna', async () => {
  const first = await login();
  const second = await login();

  const rotated = await request(app.getHttpServer())
    .post('/auth/refresh')
    .set('Cookie', first)
    .expect(200);

  await request(app.getHttpServer())
    .post('/auth/refresh')
    .set('Cookie', first)
    .expect(401);

  await request(app.getHttpServer())
    .post('/auth/refresh')
    .set('Cookie', second)
    .expect(401);

  await request(app.getHttpServer())
    .post('/auth/refresh')
    .set('Cookie', cookieOf(rotated))
    .expect(401);
});

it('refresh tanpa cookie dijawab 401, bukan 500', async () => {
  await request(app.getHttpServer()).post('/auth/refresh').expect(401);
});

it('logout mencabut token dan menghapus cookie', async () => {
  const cookie = await login();

  const res = await request(app.getHttpServer())
    .post('/auth/logout')
    .set('Cookie', cookie)
    .expect(204);

  expect(res.headers['set-cookie'][0]).toContain('rt=;');
  expect(res.headers['set-cookie'][0]).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);

  await request(app.getHttpServer())
    .post('/auth/refresh')
    .set('Cookie', cookie)
    .expect(401);
});

it('dua refresh bersamaan: satu menang, satu 401', async () => {
  const cookie = await login();

  const results = await Promise.all([
    request(app.getHttpServer()).post('/auth/refresh').set('Cookie', cookie),
    request(app.getHttpServer()).post('/auth/refresh').set('Cookie', cookie),
  ]);

  expect(results.map((res) => res.status).sort()).toEqual([200, 401]);
});

it('refresh dengan token kedaluwarsa dijawab 401 tanpa memperpanjang sesi', async () => {
  const cookie = await login();

  const stored = await prisma.refreshToken.findFirstOrThrow();
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });

  await request(app.getHttpServer())
    .post('/auth/refresh')
    .set('Cookie', cookie)
    .expect(401);

  expect(await prisma.refreshToken.count()).toBe(1);
});

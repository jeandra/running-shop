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

it('login benar mengembalikan access token dan cookie refresh', async () => {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'BUDI@mail.com', password: credentials.password })
    .expect(200);

  expect(res.body.accessToken).toBeDefined();
  expect(res.headers['set-cookie'][0]).toContain('rt=');
  expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
});

it('password salah dan email tidak dikenal memberi pesan yang sama', async () => {
  const wrongPassword = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: credentials.email, password: 'PasswordSalah123!' })
    .expect(401);

  const unknownEmail = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'tidak-ada@mail.com', password: credentials.password })
    .expect(401);

  expect(wrongPassword.body).toEqual(unknownEmail.body);
});

it('permintaan login ke-11 dalam satu menit dijawab 429', async () => {
  for (let i = 0; i < 10; i += 1) {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: credentials.email, password: 'PasswordSalah123!' })
      .expect(401);
  }

  await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: credentials.email, password: 'PasswordSalah123!' })
    .expect(429);
});

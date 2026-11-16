import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { PasswordService } from '../src/auth/password.service';
import { createTestApp } from './create-app';
import { resetDb } from './reset-db';

const prisma = new PrismaClient();
let app: INestApplication;

beforeAll(async () => {
  app = await createTestApp();
});

beforeEach(async () => {
  await resetDb(prisma);
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

const body = {
  name: 'Budi',
  email: 'Budi@Mail.com ',
  password: 'Password123!',
};

it('mendaftar dan tidak mengembalikan password', async () => {
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send(body)
    .expect(201);

  expect(res.body).toMatchObject({ email: 'budi@mail.com', role: 'CUSTOMER' });
  expect(JSON.stringify(res.body)).not.toMatch(/password/i);
});

it('email yang sama dengan huruf berbeda ditolak 409', async () => {
  await request(app.getHttpServer()).post('/auth/register').send(body).expect(201);

  await request(app.getHttpServer())
    .post('/auth/register')
    .send({ ...body, email: 'BUDI@mail.com' })
    .expect(409);
});

it('password 7 karakter ditolak 400', async () => {
  await request(app.getHttpServer())
    .post('/auth/register')
    .send({ ...body, password: 'a'.repeat(7) })
    .expect(400);
});

it('password 10.000 karakter ditolak 400 tanpa memanggil argon2', async () => {
  const hashSpy = jest.spyOn(PasswordService.prototype, 'hash');

  await request(app.getHttpServer())
    .post('/auth/register')
    .send({ ...body, password: 'a'.repeat(10_000) })
    .expect(400);

  expect(hashSpy).not.toHaveBeenCalled();
  hashSpy.mockRestore();
});

it('field tak dikenal ditolak 400', async () => {
  await request(app.getHttpServer())
    .post('/auth/register')
    .send({ ...body, role: 'ADMIN' })
    .expect(400);
});

it('body yang bukan JSON dijawab 400, bukan 500', async () => {
  await request(app.getHttpServer())
    .post('/auth/register')
    .set('Content-Type', 'application/json')
    .send('bukan json')
    .expect(400);
});

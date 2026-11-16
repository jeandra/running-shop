import { Controller, Get, INestApplication, Module, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient, Role } from '@prisma/client';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthModule } from '../src/auth/auth.module';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { Roles } from '../src/auth/roles.decorator';
import { RolesGuard } from '../src/auth/roles.guard';
import { resetDb } from './reset-db';

const prisma = new PrismaClient();
let app: INestApplication;

@Controller('test-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
class TestAdminController {
  @Get()
  @Roles(Role.ADMIN)
  adminOnly() {
    return { ok: true };
  }
}

@Module({ imports: [AuthModule], controllers: [TestAdminController] })
class TestAdminModule {}

const credentials = {
  name: 'Budi',
  email: 'budi@mail.com',
  password: 'Password123!',
};

beforeEach(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule, TestAdminModule],
  }).compile();

  app = moduleRef.createNestApplication();
  await app.init();
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

  return res.body.accessToken as string;
}

it('tanpa token dijawab 401', async () => {
  await request(app.getHttpServer()).get('/users/me').expect(401);
});

it('token customer di route admin dijawab 403', async () => {
  const token = await login();

  await request(app.getHttpServer())
    .get('/test-admin')
    .set('Authorization', `Bearer ${token}`)
    .expect(403);
});

it('token admin di route admin dijawab 200', async () => {
  await prisma.user.update({
    where: { email: credentials.email },
    data: { role: Role.ADMIN },
  });
  const token = await login();

  await request(app.getHttpServer())
    .get('/test-admin')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
});

it('profil tidak memuat passwordHash', async () => {
  const token = await login();

  const res = await request(app.getHttpServer())
    .get('/users/me')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  expect(Object.keys(res.body).sort()).toEqual(['email', 'id', 'name', 'role']);
});

it('token kedaluwarsa dijawab 401', async () => {
  const jwt = app.get(JwtService);
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: credentials.email },
  });
  const token = jwt.sign(
    { sub: user.id, role: user.role },
    { expiresIn: '-1s' },
  );

  await request(app.getHttpServer())
    .get('/users/me')
    .set('Authorization', `Bearer ${token}`)
    .expect(401);
});

import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/prisma/prisma.service';

async function tokenFor(
  app: INestApplication,
  role: Role,
): Promise<string> {
  const prisma = app.get(PrismaService);
  const user = await prisma.user.create({
    data: {
      name: 'Test User',
      email: `test-${role.toLowerCase()}-${randomUUID()}@test.local`,
      passwordHash: 'x',
      role,
    },
  });

  return app.get(JwtService).sign({ sub: user.id, role: user.role });
}

export const adminToken = (app: INestApplication): Promise<string> =>
  tokenFor(app, Role.ADMIN);

export const customerToken = (app: INestApplication): Promise<string> =>
  tokenFor(app, Role.CUSTOMER);

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  signAccess(userId: string, role: Role): string {
    return this.jwt.sign({ sub: userId, role });
  }

  async issueRefresh(userId: string): Promise<string> {
    const raw = randomBytes(32).toString('base64url');

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256(raw),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return raw;
  }
}

function sha256(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

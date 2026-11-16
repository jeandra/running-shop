import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type RotatedToken = { userId: string; role: Role; raw: string };

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

  async rotate(rawToken: string): Promise<RotatedToken> {
    const now = new Date();
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(rawToken) },
      include: { user: { select: { role: true } } },
    });

    if (!token) {
      throw new UnauthorizedException('Sesi tidak valid');
    }

    if (token.revokedAt) {
      await this.revokeAll(token.userId);
      throw new UnauthorizedException('Sesi tidak valid');
    }

    if (token.expiresAt < now) {
      throw new UnauthorizedException('Sesi tidak valid');
    }

    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: token.id, revokedAt: null },
      data: { revokedAt: now },
    });

    if (count === 0) {
      throw new UnauthorizedException('Sesi tidak valid');
    }

    return {
      userId: token.userId,
      role: token.user.role,
      raw: await this.issueRefresh(token.userId),
    };
  }

  async revoke(rawToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

function sha256(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

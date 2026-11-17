import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { Request } from 'express';
import type { AuthUser } from '../auth/jwt-auth.guard';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const [type, token] = (req.headers.authorization ?? '').split(' ');
    if (type === 'Bearer' && token) {
      try {
        const payload = await this.jwt.verifyAsync<{ sub: string; role: Role }>(token);
        req.user = { id: payload.sub, role: payload.role };
      } catch {
        // ignore invalid token; treat as guest
      }
    }
    return true;
  }
}

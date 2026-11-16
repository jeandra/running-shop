import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  me(@Req() req: Request & { user: AuthUser }) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true },
    });
  }
}

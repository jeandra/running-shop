import { Controller, Get, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { OptionalJwtAuthGuard } from '../cart/optional-jwt-auth.guard';
import { readCookie, CART_COOKIE } from '../cart/cart.service';
import type { AuthUser } from '../auth/jwt-auth.guard';

@Controller('orders')
@UseGuards(OptionalJwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('checkout')
  checkout(@Req() req: Request) {
    const user = (req as Request & { user?: AuthUser }).user;
    const sessionId = readCookie(req, CART_COOKIE);
    return this.orders.checkout({ userId: user?.id, sessionId });
  }

  @Get()
  list(@Req() req: Request) {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?.id) throw new UnauthorizedException();
    return this.orders.listOrders(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?.id) throw new UnauthorizedException();
    return this.orders.findOne(id, user.id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Req() req: Request) {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?.id) throw new UnauthorizedException();
    return this.orders.cancel(id, user.id);
  }
}

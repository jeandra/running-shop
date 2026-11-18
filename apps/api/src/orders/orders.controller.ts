import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { OptionalJwtAuthGuard } from '../cart/optional-jwt-auth.guard';
import { readCookie, CART_COOKIE } from '../cart/cart.service';
import type { AuthUser } from '../auth/jwt-auth.guard';
import { CheckoutOrderDto } from './dto/checkout-order.dto';

@Controller('orders')
@UseGuards(OptionalJwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('checkout')
  checkout(@Req() req: Request, @Body() _dto: CheckoutOrderDto) {
    const user = (req as Request & { user?: AuthUser }).user;
    const sessionId = readCookie(req, CART_COOKIE);
    return this.orders.checkout({ userId: user?.id, sessionId });
  }
}

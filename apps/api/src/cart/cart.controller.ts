import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { CartService } from './cart.service';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('cart')
@UseGuards(OptionalJwtAuthGuard)
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  get(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.cart.getCart(req, res);
  }

  @Post('items')
  add(@Body() dto: AddCartItemDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.cart.addItem(req, res, dto.variantId, dto.quantity);
  }

  @Patch('items/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.cart.updateItem(req, res, id, dto.quantity);
  }

  @Delete('items/:id')
  remove(@Param('id') id: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.cart.removeItem(req, res, id);
  }
}

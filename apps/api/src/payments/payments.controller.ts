import { Body, Controller, Headers, Post, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { OptionalJwtAuthGuard } from '../cart/optional-jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MidtransWebhookDto } from './dto/midtrans-webhook.dto';

@Controller('payments')
@UseGuards(OptionalJwtAuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  create(@Body() dto: CreatePaymentDto, @Req() req: Request) {
    const user = (req as Request & { user?: { id: string } }).user;
    if (!user?.id) throw new UnauthorizedException();
    return this.payments.createTransaction({ orderId: dto.orderId });
  }

  @Post('webhook')
  webhook(@Body() dto: MidtransWebhookDto, @Headers('x-midtrans-signature') signature: string) {
    return this.payments.processWebhook({
      orderId: dto.order_id ?? '',
      payload: {
        event_id: dto.event_id,
        transaction: dto.transaction,
        order_id: dto.order_id,
      },
      signature,
    });
  }
}

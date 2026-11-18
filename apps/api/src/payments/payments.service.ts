import { Injectable, UnauthorizedException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHmac } from 'crypto';
import type { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly serverKey = process.env.MIDTRANS_SERVER_KEY ?? '';
  private readonly webhookSecret = process.env.MIDTRANS_WEBHOOK_SECRET ?? '';
  private readonly baseUrl = process.env.MIDTRANS_BASE_URL ?? 'https://api.sandbox.midtrans.com';

  constructor(private readonly prisma: PrismaService) {}

  async createTransaction(input: { orderId: string }): Promise<{ transactionId: string; paymentUrl: string }> {
    const order = await this.prisma.order.findUnique({ where: { id: input.orderId } });
    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');
    if (order.status !== 'PENDING_PAYMENT') throw new ConflictException('Pesanan tidak valid untuk pembayaran');

    const response = await fetch(`${this.baseUrl}/v2/snap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`:${this.serverKey}`).toString('base64')}`,
      },
      body: JSON.stringify({
        transaction: { payment_type: 'credit_card', cancel_url: 'http://localhost:3000/cart' },
        order: { order_id: order.id, amount: order.total },
        customer: { email: 'customer@toko.test' },
      }),
    });
    if (!response.ok) throw new Error('Midtrans gagal membuat transaksi');
    const data = (await response.json()) as { transaction_id?: string; payment_url?: string };
    if (!data.transaction_id || !data.payment_url) throw new Error('Midtrans tidak mengembalikan transaction');
    return { transactionId: data.transaction_id, paymentUrl: data.payment_url };
  }

  async processWebhook(input: {
    orderId: string;
    payload: Record<string, unknown>;
    signature: string;
  }): Promise<{ processed: boolean }> {
    const expected = createHmac('sha512', this.webhookSecret).update(JSON.stringify(input.payload)).digest('hex');
    if (input.signature !== expected) throw new UnauthorizedException('Signature webhook tidak valid');

    const eventId = String((input.payload as { event_id?: unknown }).event_id ?? (input.payload as { id?: unknown }).id ?? '');
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { provider_eventId: { provider: 'midtrans', eventId } },
    });
    if (existing) return { processed: false };

    await this.prisma.webhookEvent.create({
      data: { provider: 'midtrans', eventId, payload: input.payload as Prisma.InputJsonValue, processedAt: new Date() },
    });

    const order = await this.prisma.order.findUnique({ where: { id: input.orderId } });
    if (!order) return { processed: true };

    const transactionStatus = (input.payload as { transaction?: { status?: string } }).transaction?.status;
    if (transactionStatus === 'payment_finish') {
      await this.prisma.order.update({ where: { id: order.id }, data: { status: 'PAID', paidAt: new Date() } });
      return { processed: true };
    }

    await this.prisma.order.update({ where: { id: order.id }, data: { status: 'EXPIRED' } });
    const items = await this.prisma.orderItem.findMany({ where: { orderId: order.id } });
    for (const item of items) {
      await this.prisma.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.qty } } });
    }
    return { processed: true };
  }
}

import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Order, OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async checkout(input: { userId?: string; sessionId?: string }): Promise<{ order: Order; cartId: string }> {
    const cart = input.userId
      ? await this.prisma.cart.findUnique({ where: { userId: input.userId } })
      : input.sessionId
        ? await this.prisma.cart.findUnique({ where: { sessionId: input.sessionId } })
        : null;

    if (!cart) throw new NotFoundException('Keranjang tidak ditemukan');

    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: { variant: { include: { product: true } } },
    });

    if (items.length === 0) throw new BadRequestException('Keranjang kosong');

    const subtotal = items.reduce((sum, item) => sum + item.variant.product.price * item.qty, 0);

    const order = await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        const result = await tx.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: item.qty } },
          data: { stock: { decrement: item.qty } },
        });
        if (result.count === 0) throw new ConflictException('Stok tidak mencukupi');
      }

      return tx.order.create({
        data: {
          orderNumber: `ORD-${Date.now()}-${cart.id}`,
          userId: cart.userId ?? input.userId!,
          addressSnapshot: {},
          subtotal,
          shippingCost: 0,
          discount: 0,
          total: subtotal,
          status: 'PENDING_PAYMENT',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          items: {
            create: items.map((item) => ({
              variantId: item.variantId,
              productId: item.variant.productId,
              nameSnapshot: item.variant.product.name,
              sizeSnapshot: item.variant.sizeEu,
              priceSnapshot: item.variant.product.price,
              qty: item.qty,
            })),
          },
        },
        include: { items: true },
      });
    });

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return { order, cartId: cart.id };
  }

  async expireDueOrders(): Promise<{ cancelled: number }> {
    const now = new Date();
    const due = await this.prisma.order.findMany({
      where: { status: 'PENDING_PAYMENT', expiresAt: { lt: now } },
      select: { id: true, userId: true },
    });

    let cancelled = 0;
    for (const order of due) {
      await this.cancel(order.id, order.userId);
      cancelled += 1;
    }

    return { cancelled };
  }

  async listOrders(userId: string): Promise<Order[]> {
    return this.prisma.order.findMany({ where: { userId }, include: { items: true }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string, userId: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order || order.userId !== userId) throw new NotFoundException('Pesanan tidak ditemukan');
    return order;
  }

  async cancel(id: string, userId: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order || order.userId !== userId) throw new NotFoundException('Pesanan tidak ditemukan');
    if (order.status !== 'PENDING_PAYMENT') throw new ConflictException('Status pesanan tidak valid untuk pembatalan');

    await this.prisma.order.update({ where: { id }, data: { status: 'CANCELLED' } });
    const items = await this.prisma.orderItem.findMany({ where: { orderId: order.id } });
    for (const item of items) {
      await this.prisma.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.qty } } });
    }

    const updated = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    return updated!;
  }

  async listAll(status?: OrderStatus): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: status ? { status } : undefined,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: OrderStatus, trackingNumber?: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');
    await this.prisma.order.update({ where: { id }, data: { status, trackingNumber: trackingNumber ?? order.trackingNumber } });
    const updated = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    return updated!;
  }
}

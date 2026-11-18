import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import type { AuthUser } from '../auth/jwt-auth.guard';

export const CART_COOKIE = 'cart_session';

export function readCookie(req: Request, name: string): string | undefined {
  const prefix = `${name}=`;
  const found = req.headers.cookie
    ?.split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(prefix));
  return found?.slice(prefix.length);
}

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveCart(req: Request, res: Response): Promise<string> {
    const cached = (req as Request & { __cartId?: string }).__cartId;
    if (cached) return cached;

    const user = (req as Request & { user?: AuthUser }).user;

    if (user) {
      const guestSession = readCookie(req, CART_COOKIE);
      if (guestSession) {
        await this.mergeGuest(guestSession, user.id);
        res.clearCookie(CART_COOKIE, { path: '/' });
      }
      const cart = await this.upsertCartByUser(user.id);
      (req as Request & { __cartId?: string }).__cartId = cart.id;
      return cart.id;
    }

    let sessionId = readCookie(req, CART_COOKIE);
    if (!sessionId) {
      sessionId = randomUUID();
      res.cookie(CART_COOKIE, sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }
    const cart = await this.upsertCartBySession(sessionId);
    (req as Request & { __cartId?: string }).__cartId = cart.id;
    return cart.id;
  }

  private async upsertCartByUser(userId: string): Promise<{ id: string }> {
    try {
      return await this.prisma.cart.upsert({
        where: { userId },
        create: { userId },
        update: {},
        select: { id: true },
      });
    } catch (e) {
      if ((e as { code?: string })?.code === 'P2002') {
        const found = await this.prisma.cart.findUnique({ where: { userId }, select: { id: true } });
        if (found) return found;
      }
      throw e;
    }
  }

  private async upsertCartBySession(sessionId: string): Promise<{ id: string }> {
    try {
      return await this.prisma.cart.upsert({
        where: { sessionId },
        create: { sessionId },
        update: {},
        select: { id: true },
      });
    } catch (e) {
      if ((e as { code?: string })?.code === 'P2002') {
        const found = await this.prisma.cart.findUnique({ where: { sessionId }, select: { id: true } });
        if (found) return found;
      }
      throw e;
    }
  }

  async mergeGuest(sessionId: string, userId: string): Promise<void> {
    const guest = await this.prisma.cart.findUnique({
      where: { sessionId },
      include: { items: true },
    });
    if (!guest || guest.items.length === 0) {
      if (guest) await this.prisma.cart.delete({ where: { id: guest.id } });
      return;
    }
    const userCart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true },
    });
    for (const item of guest.items) {
      await this.prisma.cartItem.upsert({
        where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } },
        create: { cartId: userCart.id, variantId: item.variantId, qty: item.qty },
        update: { qty: { increment: item.qty } },
      });
    }
    await this.prisma.cart.delete({ where: { id: guest.id } });
  }

  async getCart(req: Request, res: Response) {
    const cartId = await this.resolveCart(req, res);
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            variant: {
              include: { product: { select: { id: true, name: true, slug: true, brand: true, price: true, image: true } } },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    const items = cart?.items ?? [];
    const subtotal = items.reduce((s, i) => s + i.variant.product.price * i.qty, 0);
    return {
      id: cartId,
      items: items.map((i) => ({
        id: i.id,
        quantity: i.qty,
        variant: {
          id: i.variant.id,
          sizeEu: i.variant.sizeEu,
          sku: i.variant.sku,
          stock: i.variant.stock,
        },
        product: i.variant.product,
      })),
      subtotal,
      totalItems: items.reduce((s, i) => s + i.qty, 0),
    };
  }

  async addItem(req: Request, res: Response, variantId: string, quantity: number) {
    const cartId = await this.resolveCart(req, res);
    const qty = Math.max(1, Math.floor(quantity || 1));
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId }, select: { id: true } });
    if (!variant) throw new NotFoundException('Varian tidak ditemukan');
    try {
      await this.prisma.cartItem.upsert({
        where: { cartId_variantId: { cartId, variantId } },
        create: { cartId, variantId, qty },
        update: { qty: { increment: qty } },
      });
    } catch (e) {
      if ((e as { code?: string })?.code === 'P2002') {
        await this.prisma.cartItem.update({
          where: { cartId_variantId: { cartId, variantId } },
          data: { qty: { increment: qty } },
        });
      } else {
        throw e;
      }
    }
    return this.getCart(req, res);
  }

  async updateItem(req: Request, res: Response, itemId: string, quantity: number) {
    const cartId = await this.resolveCart(req, res);
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId } });
    if (!item) return this.getCart(req, res);
    if (quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      await this.prisma.cartItem.update({ where: { id: itemId }, data: { qty: Math.floor(quantity) } });
    }
    return this.getCart(req, res);
  }

  async removeItem(req: Request, res: Response, itemId: string) {
    const cartId = await this.resolveCart(req, res);
    await this.prisma.cartItem.deleteMany({ where: { id: itemId, cartId } });
    return this.getCart(req, res);
  }
}

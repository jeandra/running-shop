import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PAID_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED'] as const;

@Injectable()
export class AdminReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(): Promise<{
    totalRevenue: number;
    totalOrders: number;
    topProducts: { productId: string; name: string; qty: number }[];
  }> {
    const revenueAgg = await this.prisma.order.aggregate({
      where: { status: { in: [...PAID_STATUSES] } },
      _sum: { total: true },
    });

    const totalOrders = await this.prisma.order.count();

    const grouped = await this.prisma.orderItem.groupBy({
      where: { order: { status: { in: [...PAID_STATUSES] } } },
      by: ['productId'],
      _sum: { qty: true },
      orderBy: { _sum: { qty: 'desc' } },
      take: 5,
    });

    const products = await this.prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(products.map((p) => [p.id, p.name]));

    return {
      totalRevenue: revenueAgg._sum.total ?? 0,
      totalOrders,
      topProducts: grouped.map((g) => ({
        productId: g.productId,
        name: nameById.get(g.productId) ?? '',
        qty: g._sum.qty ?? 0,
      })),
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListProductsDto, ProductSort } from './dto/list-products.dto';

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  gender: string;
  price: number;
  image: string | null;
  category: { name: string; slug: string };
  stockTotal: number;
  sku: string | null;
};

export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  gender: string;
  description: string;
  price: number;
  image: string | null;
  weightGram: number | null;
  dropMm: number | null;
  stackMm: number | null;
  cushioning: string | null;
  support: string | null;
  terrain: string | null;
  category: { id: string; name: string; slug: string };
  variants: { id: string; sizeEu: number; sku: string; stock: number }[];
};

export type ProductList = {
  items: ProductListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export const PRODUCT_LIST_SELECT = {
  id: true,
  name: true,
  slug: true,
  brand: true,
  gender: true,
  price: true,
  image: true,
  category: { select: { name: true, slug: true } },
  variants: {
    where: { isActive: true },
    orderBy: { sizeEu: 'asc' },
    select: { stock: true, sku: true },
  },
} satisfies Prisma.ProductSelect;

export const PRODUCT_DETAIL_SELECT = {
  id: true,
  name: true,
  slug: true,
  brand: true,
  gender: true,
  description: true,
  price: true,
  image: true,
  weightGram: true,
  dropMm: true,
  stackMm: true,
  cushioning: true,
  support: true,
  terrain: true,
  category: { select: { id: true, name: true, slug: true } },
  variants: {
    where: { isActive: true },
    orderBy: { sizeEu: 'asc' },
    select: { id: true, sizeEu: true, sku: true, stock: true },
  },
} satisfies Prisma.ProductSelect;

// Prisma tidak meng-escape wildcard LIKE; tanpa ini "%" mencocokkan semua produk.
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function orderFor(
  sort: ProductSort,
): Prisma.ProductOrderByWithRelationInput[] {
  const byId: Prisma.ProductOrderByWithRelationInput = { id: 'asc' };

  if (sort === 'price_asc') {
    return [{ price: 'asc' }, byId];
  }
  if (sort === 'price_desc') {
    return [{ price: 'desc' }, byId];
  }
  return [{ createdAt: 'desc' }, byId];
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListProductsDto): Promise<ProductList> {
    const where: Prisma.ProductWhereInput = { isActive: true };
    const search = query.search?.trim();
    if (search) {
      where.name = { contains: escapeLike(search), mode: 'insensitive' };
    }

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: PRODUCT_LIST_SELECT,
        orderBy: orderFor(query.sort),
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: rows.map(({ variants, ...product }) => ({
        ...product,
        stockTotal: variants.reduce((sum, variant) => sum + variant.stock, 0),
        // shortcut: card shows first active variant's SKU (smallest size); upgrade when multi-variant SKU display is needed
        sku: variants[0]?.sku ?? null,
      })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findBySlug(slug: string): Promise<ProductDetail> {
    const product = await this.prisma.product.findFirst({
      where: { slug, isActive: true },
      select: PRODUCT_DETAIL_SELECT,
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    return product;
  }
}

import { randomUUID } from 'node:crypto';
import {
  Category,
  Prisma,
  PrismaClient,
  Product,
  ProductVariant,
} from '@prisma/client';

export async function makeCategory(
  prisma: PrismaClient,
  name = 'Test Category',
): Promise<Category> {
  return prisma.category.upsert({
    where: { slug: 'test-cat' },
    update: {},
    create: { name, slug: 'test-cat' },
  });
}

export async function makeProduct(
  prisma: PrismaClient,
  overrides: Partial<Prisma.ProductUncheckedCreateInput> = {},
): Promise<Product> {
  const categoryId =
    overrides.categoryId ?? (await makeCategory(prisma)).id;

  return prisma.product.create({
    data: {
      name: 'Test Product',
      slug: `test-${randomUUID()}`,
      brand: 'Test',
      gender: 'unisex',
      description: 'Deskripsi uji',
      price: 100_000,
      ...overrides,
      categoryId,
    },
  });
}

export async function makeVariant(
  prisma: PrismaClient,
  productId: string,
  sizeEu = 42,
  stock = 5,
  isActive = true,
): Promise<ProductVariant> {
  return prisma.productVariant.create({
    data: {
      productId,
      sizeEu,
      sku: `${productId}-${sizeEu}`,
      stock,
      isActive,
    },
  });
}

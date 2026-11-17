import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { slugify, uniqueSlug } from '../catalog/slug';
import {
  PRODUCT_LIST_SELECT,
  ProductDetail,
  ProductListItem,
  escapeLike,
  orderFor,
} from '../catalog/products.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ListAdminProductsDto } from './dto/list-admin-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

export type AdminVariant = ProductDetail['variants'][number] & {
  isActive: boolean;
};

export type AdminProduct = Omit<ProductDetail, 'variants'> & {
  isActive: boolean;
  variants: AdminVariant[];
};

export type AdminProductListItem = ProductListItem & { isActive: boolean };

export type AdminProductList = {
  items: AdminProductListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const ADMIN_LIST_SELECT = {
  ...PRODUCT_LIST_SELECT,
  isActive: true,
} satisfies Prisma.ProductSelect;

const ADMIN_DETAIL_SELECT = {
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
  isActive: true,
  category: { select: { id: true, name: true, slug: true } },
  variants: {
    orderBy: { sizeEu: 'asc' },
    select: {
      id: true,
      sizeEu: true,
      sku: true,
      stock: true,
      isActive: true,
    },
  },
} satisfies Prisma.ProductSelect;

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class AdminCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts(query: ListAdminProductsDto): Promise<AdminProductList> {
    const where: Prisma.ProductWhereInput = {};
    if (!query.includeInactive) {
      where.isActive = true;
    }
    const search = query.search?.trim();
    if (search) {
      where.name = { contains: escapeLike(search), mode: 'insensitive' };
    }

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: ADMIN_LIST_SELECT,
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
      })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findOne(id: string): Promise<AdminProduct> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: ADMIN_DETAIL_SELECT,
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    return product;
  }

  async createProduct(dto: CreateProductDto): Promise<AdminProduct> {
    await this.ensureCategory(dto.categoryId);

    const slug = await uniqueSlug(
      slugify(dto.name),
      async (candidate) =>
        (await this.prisma.product.count({ where: { slug: candidate } })) > 0,
    );

    try {
      return await this.prisma.product.create({
        data: { ...dto, slug },
        select: ADMIN_DETAIL_SELECT,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Produk sudah ada');
      }
      throw error;
    }
  }

  async updateProduct(
    id: string,
    dto: UpdateProductDto,
  ): Promise<AdminProduct> {
    await this.findOne(id);
    if (dto.categoryId) {
      await this.ensureCategory(dto.categoryId);
    }

    try {
      return await this.prisma.product.update({
        where: { id },
        data: dto,
        select: ADMIN_DETAIL_SELECT,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Produk sudah ada');
      }
      throw error;
    }
  }

  async softDeleteProduct(id: string): Promise<void> {
    const { count } = await this.prisma.product.updateMany({
      where: { id },
      data: { isActive: false },
    });

    if (count === 0) {
      throw new NotFoundException('Produk tidak ditemukan');
    }
  }

  private async ensureCategory(categoryId: string): Promise<void> {
    const count = await this.prisma.category.count({
      where: { id: categoryId },
    });

    if (count === 0) {
      throw new BadRequestException('Kategori tidak dikenal');
    }
  }
}

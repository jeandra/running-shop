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
import { CreateVariantDto } from './dto/create-variant.dto';
import { ListAdminProductsDto } from './dto/list-admin-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

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

const VARIANT_SELECT = {
  id: true,
  sizeEu: true,
  sku: true,
  stock: true,
  isActive: true,
} satisfies Prisma.ProductVariantSelect;

export type AdminVariantRecord = {
  id: string;
  sizeEu: number;
  sku: string;
  stock: number;
  isActive: boolean;
};

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

  async createVariant(
    productId: string,
    dto: CreateVariantDto,
  ): Promise<AdminVariantRecord> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { slug: true },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    try {
      return await this.prisma.productVariant.create({
        data: {
          productId,
          sizeEu: dto.sizeEu,
          stock: dto.stock,
          sku: dto.sku ?? `${product.slug}-${dto.sizeEu}`,
        },
        select: VARIANT_SELECT,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const existing = await this.prisma.productVariant.findUnique({
          where: { productId_sizeEu: { productId, sizeEu: dto.sizeEu } },
          select: { id: true, sku: true, isActive: true },
        });

        // Ukuran yang pernah dihapus masih memegang unique (productId, sizeEu);
        // menambahkannya lagi berarti menghidupkan baris itu, bukan 409.
        if (existing && !existing.isActive) {
          return await this.prisma.productVariant.update({
            where: { id: existing.id },
            data: {
              isActive: true,
              stock: dto.stock,
              sku: dto.sku ?? existing.sku,
            },
            select: VARIANT_SELECT,
          });
        }

        throw new ConflictException('Ukuran atau SKU sudah dipakai');
      }
      throw error;
    }
  }

  async updateVariant(
    id: string,
    dto: UpdateVariantDto,
  ): Promise<AdminVariantRecord> {
    await this.ensureVariant(id);

    try {
      return await this.prisma.productVariant.update({
        where: { id },
        data: dto,
        select: VARIANT_SELECT,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Ukuran atau SKU sudah dipakai');
      }
      throw error;
    }
  }

  async softDeleteVariant(id: string): Promise<void> {
    const { count } = await this.prisma.productVariant.updateMany({
      where: { id },
      data: { isActive: false },
    });

    if (count === 0) {
      throw new NotFoundException('Varian tidak ditemukan');
    }
  }

  private async ensureVariant(id: string): Promise<void> {
    const count = await this.prisma.productVariant.count({ where: { id } });

    if (count === 0) {
      throw new NotFoundException('Varian tidak ditemukan');
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

  async listCategories(): Promise<
    { id: string; name: string; slug: string; productCount: number }[]
  > {
    const rows = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { products: true } },
      },
    });

    return rows.map(({ _count, ...category }) => ({
      ...category,
      productCount: _count.products,
    }));
  }

  async createCategory(name: string): Promise<{
    id: string;
    name: string;
    slug: string;
  }> {
    const duplicate = await this.prisma.category.count({ where: { name } });
    if (duplicate > 0) {
      throw new ConflictException('Kategori sudah ada');
    }

    const slug = await uniqueSlug(
      slugify(name),
      async (candidate) =>
        (await this.prisma.category.count({ where: { slug: candidate } })) > 0,
    );

    try {
      return await this.prisma.category.create({
        data: { name, slug },
        select: { id: true, name: true, slug: true },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Kategori sudah ada');
      }
      throw error;
    }
  }

  async updateCategory(
    id: string,
    name: string,
  ): Promise<{ id: string; name: string; slug: string }> {
    const exists = await this.prisma.category.count({ where: { id } });
    if (exists === 0) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }

    return this.prisma.category.update({
      where: { id },
      data: { name },
      select: { id: true, name: true, slug: true },
    });
  }

  async deleteCategory(id: string): Promise<void> {
    const exists = await this.prisma.category.count({ where: { id } });
    if (exists === 0) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }

    const products = await this.prisma.product.count({
      where: { categoryId: id },
    });
    if (products > 0) {
      throw new ConflictException('Kategori masih punya produk');
    }

    await this.prisma.category.delete({ where: { id } });
  }
}

import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import argon2 from 'argon2';
import { slugify } from '../src/catalog/slug';

export const SEED_PASSWORD = 'Password123!';

const categories = [
  { name: 'Daily trainer', slug: 'daily-trainer' },
  { name: 'Tempo dan race', slug: 'tempo-dan-race' },
  { name: 'Trail', slug: 'trail' },
  { name: 'Stability', slug: 'stability' },
];

const SIZES = [39, 40, 41, 42, 43, 44, 45];

// shortcut: 12 foto Unsplash diputar ulang untuk 28 produk, ganti dengan foto per produk saat storage tersedia
const IMAGES = [
  '1542291026-7eec264c27ff',
  '1600185365483-26d7a4cc7519',
  '1608231387042-66d1773070a5',
  '1595950653106-6c9ebd614d3a',
  '1552346154-21d32810aba3',
  '1560769629-975ec94e6a86',
  '1460353581641-37baddab0fa2',
  '1595341888016-a392ef81b7de',
  '1495555961986-6d4c1ecb7be3',
  '1539185441755-769473a23570',
  '1556906781-9a412961c28c',
  '1549298916-b41d501d3772',
].map((id) => `https://images.unsplash.com/photo-${id}?w=800&q=80`);

const STOCK_PATTERN = [4, 0, 8, 5, 0, 2, 1];
const OUT_OF_STOCK_SLUG = 'vaporfly-3';

type SeedProduct = {
  name: string;
  brand: string;
  categorySlug: string;
  gender: string;
  price: number;
  weightGram: number;
  dropMm: number;
  stackMm: number;
  cushioning: string;
  support: string;
  terrain: string;
};

const products: SeedProduct[] = [
  {
    name: 'Pegasus 41',
    brand: 'Nike',
    categorySlug: 'daily-trainer',
    gender: 'unisex',
    price: 1_899_000,
    weightGram: 285,
    dropMm: 10,
    stackMm: 38,
    cushioning: 'lembut',
    support: 'netral',
    terrain: 'road',
  },
  {
    name: 'Novablast 5',
    brand: 'Asics',
    categorySlug: 'daily-trainer',
    gender: 'unisex',
    price: 1_799_000,
    weightGram: 260,
    dropMm: 8,
    stackMm: 41,
    cushioning: 'lembut',
    support: 'netral',
    terrain: 'road',
  },
  {
    name: 'Ghost 16',
    brand: 'Brooks',
    categorySlug: 'daily-trainer',
    gender: 'wanita',
    price: 1_699_000,
    weightGram: 280,
    dropMm: 12,
    stackMm: 36,
    cushioning: 'sedang',
    support: 'netral',
    terrain: 'road',
  },
  {
    name: 'Clifton 10',
    brand: 'Hoka',
    categorySlug: 'daily-trainer',
    gender: 'unisex',
    price: 1_749_000,
    weightGram: 250,
    dropMm: 8,
    stackMm: 37,
    cushioning: 'lembut',
    support: 'netral',
    terrain: 'road',
  },
  {
    name: 'Ride 18',
    brand: 'Saucony',
    categorySlug: 'daily-trainer',
    gender: 'pria',
    price: 1_599_000,
    weightGram: 270,
    dropMm: 8,
    stackMm: 35,
    cushioning: 'sedang',
    support: 'netral',
    terrain: 'road',
  },
  {
    name: '1080v14',
    brand: 'New Balance',
    categorySlug: 'daily-trainer',
    gender: 'unisex',
    price: 1_899_000,
    weightGram: 300,
    dropMm: 6,
    stackMm: 38,
    cushioning: 'lembut',
    support: 'netral',
    terrain: 'road',
  },
  {
    name: 'Cloudsurfer 7',
    brand: 'On',
    categorySlug: 'daily-trainer',
    gender: 'pria',
    price: 2_099_000,
    weightGram: 245,
    dropMm: 10,
    stackMm: 35,
    cushioning: 'sedang',
    support: 'netral',
    terrain: 'road',
  },
  {
    name: 'Vaporfly 3',
    brand: 'Nike',
    categorySlug: 'tempo-dan-race',
    gender: 'unisex',
    price: 3_299_000,
    weightGram: 195,
    dropMm: 8,
    stackMm: 40,
    cushioning: 'keras',
    support: 'netral',
    terrain: 'road',
  },
  {
    name: 'Adios Pro 4',
    brand: 'Adidas',
    categorySlug: 'tempo-dan-race',
    gender: 'unisex',
    price: 3_199_000,
    weightGram: 200,
    dropMm: 6,
    stackMm: 39,
    cushioning: 'keras',
    support: 'netral',
    terrain: 'road',
  },
  {
    name: 'Metaspeed Sky Paris',
    brand: 'Asics',
    categorySlug: 'tempo-dan-race',
    gender: 'pria',
    price: 3_099_000,
    weightGram: 185,
    dropMm: 5,
    stackMm: 39,
    cushioning: 'keras',
    support: 'netral',
    terrain: 'road',
  },
  {
    name: 'Endorphin Pro 4',
    brand: 'Saucony',
    categorySlug: 'tempo-dan-race',
    gender: 'unisex',
    price: 2_799_000,
    weightGram: 210,
    dropMm: 8,
    stackMm: 39,
    cushioning: 'keras',
    support: 'netral',
    terrain: 'road',
  },
  {
    name: 'Rocket X 3',
    brand: 'Hoka',
    categorySlug: 'tempo-dan-race',
    gender: 'pria',
    price: 2_699_000,
    weightGram: 215,
    dropMm: 7,
    stackMm: 38,
    cushioning: 'keras',
    support: 'netral',
    terrain: 'road',
  },
  {
    name: 'Hyperion Elite 4',
    brand: 'Brooks',
    categorySlug: 'tempo-dan-race',
    gender: 'unisex',
    price: 2_899_000,
    weightGram: 205,
    dropMm: 8,
    stackMm: 39,
    cushioning: 'keras',
    support: 'netral',
    terrain: 'road',
  },
  {
    name: 'FuelCell SC Elite v4',
    brand: 'New Balance',
    categorySlug: 'tempo-dan-race',
    gender: 'unisex',
    price: 2_999_000,
    weightGram: 220,
    dropMm: 4,
    stackMm: 40,
    cushioning: 'keras',
    support: 'netral',
    terrain: 'road',
  },
  {
    name: 'Speedgoat 6',
    brand: 'Hoka',
    categorySlug: 'trail',
    gender: 'unisex',
    price: 2_399_000,
    weightGram: 300,
    dropMm: 5,
    stackMm: 38,
    cushioning: 'sedang',
    support: 'netral',
    terrain: 'trail',
  },
  {
    name: 'Sense Ride 5',
    brand: 'Salomon',
    categorySlug: 'trail',
    gender: 'pria',
    price: 1_999_000,
    weightGram: 290,
    dropMm: 8,
    stackMm: 32,
    cushioning: 'sedang',
    support: 'netral',
    terrain: 'trail',
  },
  {
    name: 'Trabuco Max 3',
    brand: 'Asics',
    categorySlug: 'trail',
    gender: 'unisex',
    price: 1_899_000,
    weightGram: 320,
    dropMm: 5,
    stackMm: 37,
    cushioning: 'lembut',
    support: 'netral',
    terrain: 'trail',
  },
  {
    name: 'Caldera 8',
    brand: 'Brooks',
    categorySlug: 'trail',
    gender: 'pria',
    price: 1_899_000,
    weightGram: 295,
    dropMm: 6,
    stackMm: 34,
    cushioning: 'sedang',
    support: 'netral',
    terrain: 'trail',
  },
  {
    name: 'Peregrine 15',
    brand: 'Saucony',
    categorySlug: 'trail',
    gender: 'wanita',
    price: 1_799_000,
    weightGram: 275,
    dropMm: 4,
    stackMm: 30,
    cushioning: 'sedang',
    support: 'netral',
    terrain: 'trail',
  },
  {
    name: 'Zegama 2',
    brand: 'Nike',
    categorySlug: 'trail',
    gender: 'unisex',
    price: 2_299_000,
    weightGram: 310,
    dropMm: 4,
    stackMm: 36,
    cushioning: 'sedang',
    support: 'netral',
    terrain: 'trail',
  },
  {
    name: 'Agravic 3',
    brand: 'Adidas',
    categorySlug: 'trail',
    gender: 'pria',
    price: 1_799_000,
    weightGram: 300,
    dropMm: 6,
    stackMm: 33,
    cushioning: 'sedang',
    support: 'netral',
    terrain: 'trail',
  },
  {
    name: 'Gel-Kayano 31',
    brand: 'Asics',
    categorySlug: 'stability',
    gender: 'unisex',
    price: 2_299_000,
    weightGram: 305,
    dropMm: 10,
    stackMm: 40,
    cushioning: 'sedang',
    support: 'stability',
    terrain: 'road',
  },
  {
    name: 'Adrenaline GTS 24',
    brand: 'Brooks',
    categorySlug: 'stability',
    gender: 'pria',
    price: 1_899_000,
    weightGram: 290,
    dropMm: 12,
    stackMm: 36,
    cushioning: 'sedang',
    support: 'stability',
    terrain: 'road',
  },
  {
    name: 'Arahi 7',
    brand: 'Hoka',
    categorySlug: 'stability',
    gender: 'unisex',
    price: 1_899_000,
    weightGram: 275,
    dropMm: 5,
    stackMm: 34,
    cushioning: 'sedang',
    support: 'stability',
    terrain: 'road',
  },
  {
    name: 'Guide 18',
    brand: 'Saucony',
    categorySlug: 'stability',
    gender: 'wanita',
    price: 1_699_000,
    weightGram: 270,
    dropMm: 8,
    stackMm: 35,
    cushioning: 'sedang',
    support: 'stability',
    terrain: 'road',
  },
  {
    name: '860v14',
    brand: 'New Balance',
    categorySlug: 'stability',
    gender: 'unisex',
    price: 1_799_000,
    weightGram: 300,
    dropMm: 12,
    stackMm: 36,
    cushioning: 'sedang',
    support: 'stability',
    terrain: 'road',
  },
  {
    name: 'Structure 25',
    brand: 'Nike',
    categorySlug: 'stability',
    gender: 'pria',
    price: 1_699_000,
    weightGram: 285,
    dropMm: 8,
    stackMm: 36,
    cushioning: 'sedang',
    support: 'stability',
    terrain: 'road',
  },
  {
    name: 'Adistar 3',
    brand: 'Adidas',
    categorySlug: 'stability',
    gender: 'unisex',
    price: 1_599_000,
    weightGram: 295,
    dropMm: 6,
    stackMm: 36,
    cushioning: 'sedang',
    support: 'stability',
    terrain: 'road',
  },
];

function describe(product: SeedProduct): string {
  const terrain = product.terrain === 'trail' ? 'lintas alam' : 'jalan raya';
  const gender =
    product.gender === 'unisex'
      ? 'pria dan wanita'
      : product.gender === 'pria'
        ? 'pria'
        : 'wanita';

  return `${product.name} dari ${product.brand} untuk lari ${terrain}, dengan bantalan ${product.cushioning} dan drop ${product.dropMm} mm. Dibuat untuk ${gender}.`;
}

export async function seedDatabase(
  prisma: PrismaClient,
): Promise<{ adminId: string; customerId: string }> {
  const passwordHash = await argon2.hash(SEED_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@toko.test' },
    update: {},
    create: {
      name: 'Admin Toko',
      email: 'admin@toko.test',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@toko.test' },
    update: {},
    create: {
      name: 'Pembeli Contoh',
      email: 'customer@toko.test',
      passwordHash,
    },
  });

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    });
  }

  const categoryIds = new Map(
    (await prisma.category.findMany({ select: { id: true, slug: true } })).map(
      (category) => [category.slug, category.id],
    ),
  );

  for (const [index, item] of products.entries()) {
    const categoryId = categoryIds.get(item.categorySlug);
    if (!categoryId) {
      throw new Error(`Kategori seed tidak ditemukan: ${item.categorySlug}`);
    }

    const slug = slugify(item.name);
    const product = await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        categoryId,
        slug,
        name: item.name,
        brand: item.brand,
        gender: item.gender,
        description: describe(item),
        price: item.price,
        image: IMAGES[index % IMAGES.length],
        weightGram: item.weightGram,
        dropMm: item.dropMm,
        stackMm: item.stackMm,
        cushioning: item.cushioning,
        support: item.support,
        terrain: item.terrain,
      },
    });

    for (const [sizeIndex, sizeEu] of SIZES.entries()) {
      const stock =
        slug === OUT_OF_STOCK_SLUG
          ? 0
          : STOCK_PATTERN[(index + sizeIndex) % STOCK_PATTERN.length];

      await prisma.productVariant.upsert({
        where: { productId_sizeEu: { productId: product.id, sizeEu } },
        update: {},
        create: { productId: product.id, sizeEu, sku: `${slug}-${sizeEu}`, stock },
      });
    }
  }

  return { adminId: admin.id, customerId: customer.id };
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedDatabase(prisma)
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

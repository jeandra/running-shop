import { PrismaClient, Role } from '@prisma/client';
import argon2 from 'argon2';

export const SEED_PASSWORD = 'Password123!';

const categories = [
  { name: 'Daily trainer', slug: 'daily-trainer' },
  { name: 'Tempo dan race', slug: 'tempo-dan-race' },
  { name: 'Trail', slug: 'trail' },
  { name: 'Stability', slug: 'stability' },
];

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

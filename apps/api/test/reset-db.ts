import { PrismaClient } from '@prisma/client';

export async function resetDb(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "User", "Category", "Product", "ProductVariant", "Cart", "CartItem", "Order", "OrderItem", "Payment", "WebhookEvent", "StockMovement", "RefreshToken", "Address" CASCADE',
  );
}

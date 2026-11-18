import { Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OptionalJwtAuthGuard } from '../cart/optional-jwt-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
    }),
    NotificationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OptionalJwtAuthGuard],
  exports: [OrdersService],
})
export class OrdersModule implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly orders: OrdersService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.run(), 60_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async run() {
    await this.prisma.$executeRawUnsafe('SELECT pg_advisory_lock(424242)');
    try {
      return await this.orders.expireDueOrders();
    } finally {
      await this.prisma.$executeRawUnsafe('SELECT pg_advisory_unlock(424242)');
    }
  }
}

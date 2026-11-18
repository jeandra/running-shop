import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';
import { AdminCatalogService } from './admin-catalog.service';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminProductsController } from './admin-products.controller';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';
import { AdminVariantsController } from './admin-variants.controller';

@Module({
  imports: [AuthModule, OrdersModule],
  controllers: [
    AdminProductsController,
    AdminVariantsController,
    AdminCategoriesController,
    AdminOrdersController,
    AdminReportsController,
  ],
  providers: [AdminCatalogService, AdminReportsService],
})
export class AdminModule {}

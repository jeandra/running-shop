import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminCatalogService } from './admin-catalog.service';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminProductsController } from './admin-products.controller';
import { AdminVariantsController } from './admin-variants.controller';

@Module({
  imports: [AuthModule],
  controllers: [
    AdminProductsController,
    AdminVariantsController,
    AdminCategoriesController,
  ],
  providers: [AdminCatalogService],
})
export class AdminModule {}

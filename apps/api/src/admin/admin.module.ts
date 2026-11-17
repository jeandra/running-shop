import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminCatalogService } from './admin-catalog.service';
import { AdminProductsController } from './admin-products.controller';
import { AdminVariantsController } from './admin-variants.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminProductsController, AdminVariantsController],
  providers: [AdminCatalogService],
})
export class AdminModule {}

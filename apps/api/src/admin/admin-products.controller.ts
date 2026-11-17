import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminCatalogService } from './admin-catalog.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ListAdminProductsDto } from './dto/list-admin-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminProductsController {
  constructor(private readonly catalog: AdminCatalogService) {}

  @Get()
  list(@Query() query: ListAdminProductsDto) {
    return this.catalog.listProducts(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.catalog.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.catalog.createProduct(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.catalog.updateProduct(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.catalog.softDeleteProduct(id);
  }
}

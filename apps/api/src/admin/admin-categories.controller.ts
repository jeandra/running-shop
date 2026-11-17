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
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminCatalogService } from './admin-catalog.service';
import { CategoryNameDto } from './dto/category.dto';

@Controller('admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminCategoriesController {
  constructor(private readonly catalog: AdminCatalogService) {}

  @Get()
  list() {
    return this.catalog.listCategories();
  }

  @Post()
  create(@Body() dto: CategoryNameDto) {
    return this.catalog.createCategory(dto.name);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: CategoryNameDto) {
    return this.catalog.updateCategory(id, dto.name);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.catalog.deleteCategory(id);
  }
}

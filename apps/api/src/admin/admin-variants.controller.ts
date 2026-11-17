import {
  Body,
  Controller,
  Delete,
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
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminVariantsController {
  constructor(private readonly catalog: AdminCatalogService) {}

  @Post('products/:id/variants')
  create(@Param('id') id: string, @Body() dto: CreateVariantDto) {
    return this.catalog.createVariant(id, dto);
  }

  @Patch('variants/:id')
  update(@Param('id') id: string, @Body() dto: UpdateVariantDto) {
    return this.catalog.updateVariant(id, dto);
  }

  @Delete('variants/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.catalog.softDeleteVariant(id);
  }
}

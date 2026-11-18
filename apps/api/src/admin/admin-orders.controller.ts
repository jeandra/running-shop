import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ListAdminOrdersDto } from './dto/list-admin-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Role } from '@prisma/client';

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@Query() query: ListAdminOrdersDto) {
    return this.orders.listAll(query.status);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orders.updateStatus(id, dto.status, dto.trackingNumber);
  }
}

import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class ListAdminOrdersDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}

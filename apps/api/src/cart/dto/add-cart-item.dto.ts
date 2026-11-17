import { IsInt, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddCartItemDto {
  @IsString()
  @IsUUID()
  variantId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity = 1;
}

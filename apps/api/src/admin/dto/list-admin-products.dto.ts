import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { ListProductsDto } from '../../catalog/dto/list-products.dto';

export class ListAdminProductsDto extends ListProductsDto {
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeInactive = false;
}

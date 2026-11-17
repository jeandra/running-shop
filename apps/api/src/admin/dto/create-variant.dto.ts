import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateVariantDto {
  @IsInt()
  @Min(39)
  @Max(45)
  sizeEu: number;

  @IsInt()
  @Min(0)
  stock: number;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  sku?: string;
}

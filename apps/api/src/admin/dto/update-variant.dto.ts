import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class UpdateVariantDto {
  @IsOptional()
  @IsInt()
  @Min(39)
  @Max(45)
  sizeEu?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  sku?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

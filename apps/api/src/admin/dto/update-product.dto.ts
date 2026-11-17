import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';
import {
  CUSHIONINGS,
  GENDERS,
  SUPPORTS,
  TERRAINS,
} from './create-product.dto';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  brand?: string;

  @IsOptional()
  @IsIn(GENDERS)
  gender?: string;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  price?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categoryId?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  image?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2000)
  weightGram?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  dropMm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(80)
  stackMm?: number;

  @IsOptional()
  @IsIn(CUSHIONINGS)
  cushioning?: string;

  @IsOptional()
  @IsIn(SUPPORTS)
  support?: string;

  @IsOptional()
  @IsIn(TERRAINS)
  terrain?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

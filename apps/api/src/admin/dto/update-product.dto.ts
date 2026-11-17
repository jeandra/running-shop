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
  ValidateIf,
} from 'class-validator';
import {
  CUSHIONINGS,
  GENDERS,
  SUPPORTS,
  TERRAINS,
} from './create-product.dto';

// Field wajib memakai ValidateIf, bukan IsOptional: IsOptional juga meloloskan null,
// yang kemudian ditolak Prisma sebagai 500.
const whenSet = (_object: unknown, value: unknown) => value !== undefined;

export class UpdateProductDto {
  @ValidateIf(whenSet)
  @IsString()
  @Length(1, 120)
  name?: string;

  @ValidateIf(whenSet)
  @IsString()
  @Length(1, 80)
  brand?: string;

  @ValidateIf(whenSet)
  @IsIn(GENDERS)
  gender?: string;

  @ValidateIf(whenSet)
  @IsString()
  @Length(1, 5000)
  description?: string;

  @ValidateIf(whenSet)
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  price?: number;

  @ValidateIf(whenSet)
  @IsString()
  @IsNotEmpty()
  categoryId?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  image?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2000)
  weightGram?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  dropMm?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(80)
  stackMm?: number | null;

  @IsOptional()
  @IsIn(CUSHIONINGS)
  cushioning?: string | null;

  @IsOptional()
  @IsIn(SUPPORTS)
  support?: string | null;

  @IsOptional()
  @IsIn(TERRAINS)
  terrain?: string | null;

  @ValidateIf(whenSet)
  @IsBoolean()
  isActive?: boolean;
}

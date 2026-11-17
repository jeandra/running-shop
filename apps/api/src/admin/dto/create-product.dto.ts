import {
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

export const GENDERS = ['pria', 'wanita', 'unisex'] as const;
export const CUSHIONINGS = ['lembut', 'sedang', 'keras'] as const;
export const SUPPORTS = ['netral', 'stability'] as const;
export const TERRAINS = ['road', 'trail'] as const;

export class CreateProductDto {
  @IsString()
  @Length(1, 120)
  name: string;

  @IsString()
  @Length(1, 80)
  brand: string;

  @IsIn(GENDERS)
  gender: string;

  @IsString()
  @Length(1, 5000)
  description: string;

  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  price: number;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

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
}

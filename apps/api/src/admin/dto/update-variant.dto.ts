import {
  IsBoolean,
  IsInt,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

// IsOptional juga meloloskan null; field wajib memakai ValidateIf agar null jadi 400.
const whenSet = (_object: unknown, value: unknown) => value !== undefined;

export class UpdateVariantDto {
  @ValidateIf(whenSet)
  @IsInt()
  @Min(39)
  @Max(45)
  sizeEu?: number;

  @ValidateIf(whenSet)
  @IsInt()
  @Min(0)
  stock?: number;

  @ValidateIf(whenSet)
  @IsString()
  @Length(1, 64)
  sku?: string;

  @ValidateIf(whenSet)
  @IsBoolean()
  isActive?: boolean;
}

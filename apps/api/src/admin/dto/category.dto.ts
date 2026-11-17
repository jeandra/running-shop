import { IsString, Length } from 'class-validator';

export class CategoryNameDto {
  @IsString()
  @Length(1, 60)
  name: string;
}

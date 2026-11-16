import { Transform } from 'class-transformer';
import { IsEmail, Length } from 'class-validator';

export class RegisterDto {
  @Length(1, 80)
  name: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail()
  email: string;

  @Length(8, 128)
  password: string;
}

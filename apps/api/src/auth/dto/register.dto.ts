import { IsEmail, Length } from 'class-validator';
import { normalizeEmail } from './normalize-email';

export class RegisterDto {
  @Length(1, 80)
  name: string;

  @normalizeEmail()
  @IsEmail()
  email: string;

  @Length(8, 128)
  password: string;
}

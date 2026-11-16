import { IsEmail, Length } from 'class-validator';
import { normalizeEmail } from './normalize-email';

export class LoginDto {
  @normalizeEmail()
  @IsEmail()
  email: string;

  @Length(8, 128)
  password: string;
}

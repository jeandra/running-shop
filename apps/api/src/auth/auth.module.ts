import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    CartModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService],
  exports: [JwtModule],
})
export class AuthModule {}

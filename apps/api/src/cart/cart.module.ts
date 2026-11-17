import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
    }),
  ],
  controllers: [CartController],
  providers: [CartService, OptionalJwtAuthGuard],
  exports: [CartService],
})
export class CartModule {}

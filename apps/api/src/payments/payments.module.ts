import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { OptionalJwtAuthGuard } from '../cart/optional-jwt-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, JwtModule.register({ secret: process.env.JWT_ACCESS_SECRET })],
  controllers: [PaymentsController],
  providers: [PaymentsService, OptionalJwtAuthGuard],
})
export class PaymentsModule {}

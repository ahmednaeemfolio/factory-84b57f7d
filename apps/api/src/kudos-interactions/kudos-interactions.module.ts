import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtStrategy } from '../auth/jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { KudosInteractionsController } from './kudos-interactions.controller';
import { KudosInteractionsService } from './kudos-interactions.service';

@Module({
  imports: [PrismaModule],
  controllers: [KudosInteractionsController],
  providers: [KudosInteractionsService, JwtAuthGuard, JwtStrategy],
  exports: [KudosInteractionsService],
})
export class KudosInteractionsModule {}

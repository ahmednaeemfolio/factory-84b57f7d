import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtStrategy } from '../auth/jwt.strategy';
import { KudosCreateController } from './kudos-create.controller';
import { KudosCreateService, KUDOS_CLOCK, SystemClock } from './kudos-create.service';

@Module({
  imports: [PrismaModule],
  controllers: [KudosCreateController],
  providers: [
    KudosCreateService,
    JwtAuthGuard,
    JwtStrategy,
    { provide: KUDOS_CLOCK, useClass: SystemClock },
  ],
  exports: [KudosCreateService],
})
export class KudosCreateModule {}

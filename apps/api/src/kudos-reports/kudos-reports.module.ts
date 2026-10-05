import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtStrategy } from '../auth/jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { KudosReportsController } from './kudos-reports.controller';
import { KudosReportsService } from './kudos-reports.service';

@Module({
  imports: [PrismaModule],
  controllers: [KudosReportsController],
  providers: [KudosReportsService, JwtAuthGuard, JwtStrategy],
  exports: [KudosReportsService],
})
export class KudosReportsModule {}

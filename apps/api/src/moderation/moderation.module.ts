import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtStrategy } from '../auth/jwt.strategy';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

@Module({
  imports: [PrismaModule],
  controllers: [ModerationController],
  providers: [ModerationService, JwtAuthGuard, JwtStrategy, RolesGuard],
  exports: [ModerationService],
})
export class ModerationModule {}

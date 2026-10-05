import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtStrategy } from '../auth/jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { KudosFeedController } from './kudos-feed.controller';
import { KudosFeedService } from './kudos-feed.service';

@Module({
  imports: [PrismaModule],
  controllers: [KudosFeedController],
  providers: [KudosFeedService, JwtAuthGuard, JwtStrategy],
  exports: [KudosFeedService],
})
export class KudosFeedModule {}

import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtStrategy } from '../auth/jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import {
  LeaderboardService,
  LEADERBOARD_CLOCK,
  SystemLeaderboardClock,
} from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';

@Module({
  imports: [PrismaModule],
  controllers: [LeaderboardController],
  providers: [
    LeaderboardService,
    JwtAuthGuard,
    JwtStrategy,
    { provide: LEADERBOARD_CLOCK, useClass: SystemLeaderboardClock },
  ],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}

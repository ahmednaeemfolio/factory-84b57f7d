import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  LeaderboardMonthDto,
  LeaderboardResult,
  LeaderboardService,
} from './leaderboard.service';

@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  getLeaderboard(@Query() query: LeaderboardMonthDto): Promise<LeaderboardResult> {
    return this.leaderboardService.getLeaderboard(query);
  }
}

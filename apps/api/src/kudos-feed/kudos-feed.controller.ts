import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KudosFeedQueryDto } from './kudos-feed.service';
import { KudosFeedService } from './kudos-feed.service';

@Controller('kudos')
@UseGuards(JwtAuthGuard)
export class KudosFeedController {
  constructor(private readonly kudosFeedService: KudosFeedService) {}

  @Get()
  list(@Query() query: KudosFeedQueryDto) {
    return this.kudosFeedService.list(query);
  }
}

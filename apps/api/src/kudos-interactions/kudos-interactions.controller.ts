import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedAccount } from '../auth/jwt.strategy';
import { KudosInteractionsService, SetReactionDto } from './kudos-interactions.service';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedAccount;
}

@Controller('kudos')
@UseGuards(JwtAuthGuard)
export class KudosInteractionsController {
  constructor(private readonly kudosInteractionsService: KudosInteractionsService) {}

  @Get(':id')
  detail(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.kudosInteractionsService.detail(id, request.user);
  }

  @Put(':id/reaction')
  setReaction(
    @Param('id') id: string,
    @Body() dto: SetReactionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.kudosInteractionsService.toggleReaction(id, dto, request.user);
  }
}

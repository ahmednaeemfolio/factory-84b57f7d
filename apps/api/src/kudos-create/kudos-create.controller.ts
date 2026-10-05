import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedAccount } from '../auth/jwt.strategy';
import { CreateKudosDto } from './dto/create-kudos.dto';
import { KudosCreateService } from './kudos-create.service';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedAccount;
}

@Controller('kudos')
@UseGuards(JwtAuthGuard)
export class KudosCreateController {
  constructor(private readonly kudosCreateService: KudosCreateService) {}

  @Post()
  create(
    @Body() dto: CreateKudosDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.kudosCreateService.create(dto, request.user);
  }
}

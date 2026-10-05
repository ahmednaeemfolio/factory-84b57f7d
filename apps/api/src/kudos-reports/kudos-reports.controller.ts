import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedAccount } from '../auth/jwt.strategy';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateReportDto } from './dto/create-report.dto';
import { KudosReportsService } from './kudos-reports.service';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedAccount;
}

@Controller('kudos')
@UseGuards(JwtAuthGuard)
export class KudosReportsController {
  constructor(private readonly kudosReportsService: KudosReportsService) {}

  @Post(':id/reports')
  createReport(
    @Param('id') kudosId: string,
    @Body() body: CreateReportDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.kudosReportsService.createReport(kudosId, body, request.user);
  }
}

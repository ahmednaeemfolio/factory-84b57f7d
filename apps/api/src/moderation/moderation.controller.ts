import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedAccount } from '../auth/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminReport, ModerationService, ResolveReportDto } from './moderation.service';

export interface AdminAuthenticatedRequest extends Request {
  user: AuthenticatedAccount;
}

@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get()
  listOpenReports(): Promise<AdminReport[]> {
    return this.moderationService.listOpenReports();
  }

  @Patch(':id/resolve')
  resolveReport(
    @Param('id') reportId: string,
    @Body() body: ResolveReportDto,
    @Req() request: AdminAuthenticatedRequest,
  ): Promise<AdminReport> {
    return this.moderationService.resolveReport(reportId, body, request.user);
  }
}

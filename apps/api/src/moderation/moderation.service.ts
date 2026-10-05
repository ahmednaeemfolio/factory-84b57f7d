import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsIn } from 'class-validator';
import { AuthenticatedAccount } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

export class ResolveReportDto {
  @IsIn(['hide', 'dismiss'])
  action!: 'hide' | 'dismiss';
}

export const ADMIN_REPORT_INCLUDE = {
  reporter: { select: { id: true, displayName: true } },
  kudos: {
    include: {
      sender: { select: { id: true, displayName: true } },
      recipients: {
        include: {
          recipient: { select: { id: true, displayName: true } },
        },
      },
    },
  },
} satisfies Prisma.KudosReportInclude;

export type AdminReport = Prisma.KudosReportGetPayload<{
  include: typeof ADMIN_REPORT_INCLUDE;
}>;

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async listOpenReports(): Promise<AdminReport[]> {
    return this.prisma.kudosReport.findMany({
      where: { status: 'OPEN' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: ADMIN_REPORT_INCLUDE,
    });
  }

  async resolveReport(
    reportId: string,
    body: ResolveReportDto,
    admin: AuthenticatedAccount,
  ): Promise<AdminReport> {
    return this.prisma.$transaction(async (transaction) => {
      const update = await transaction.kudosReport.updateMany({
        where: { id: reportId, status: 'OPEN' },
        data: {
          status: body.action === 'hide' ? 'HIDDEN' : 'DISMISSED',
          resolvedById: admin.id,
          resolvedAt: new Date(),
        },
      });

      if (update.count === 0) {
        const existing = await transaction.kudosReport.findUnique({
          where: { id: reportId },
          select: { id: true },
        });
        if (!existing) throw new NotFoundException('Report not found');
        throw new ConflictException('Only open reports can be resolved');
      }

      if (body.action === 'hide') {
        const report = await transaction.kudosReport.findUnique({
          where: { id: reportId },
          select: { kudosId: true },
        });
        if (!report) throw new NotFoundException('Report not found');
        await transaction.kudos.update({
          where: { id: report.kudosId },
          data: { isHidden: true },
        });
      }

      const resolvedReport = await transaction.kudosReport.findUnique({
        where: { id: reportId },
        include: ADMIN_REPORT_INCLUDE,
      });
      if (!resolvedReport) throw new NotFoundException('Report not found');
      return resolvedReport;
    });
  }
}

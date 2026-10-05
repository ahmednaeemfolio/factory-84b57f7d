import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthenticatedAccount } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class KudosReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(kudosId: string, body: unknown, reporter: AuthenticatedAccount) {
    const dto = plainToInstance(CreateReportDto, body);
    const validationErrors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (validationErrors.length > 0) {
      throw new BadRequestException('Report reason must be a string containing 1 to 200 characters');
    }

    const kudos = await this.prisma.kudos.findUnique({
      where: { id: kudosId },
      select: { id: true },
    });
    if (!kudos) throw new NotFoundException('Kudos not found');

    const existingReport = await this.prisma.kudosReport.findUnique({
      where: {
        kudosId_reporterId: {
          kudosId,
          reporterId: reporter.id,
        },
      },
    });
    if (existingReport) {
      throw new ConflictException('You have already reported this kudos');
    }

    try {
      return await this.prisma.kudosReport.create({
        data: {
          kudosId,
          reporterId: reporter.id,
          reason: dto.reason,
          status: 'OPEN',
        },
      });
    } catch (error) {
      // The unique database constraint also protects simultaneous duplicate submissions.
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('You have already reported this kudos');
      }
      throw error;
    }
  }
}

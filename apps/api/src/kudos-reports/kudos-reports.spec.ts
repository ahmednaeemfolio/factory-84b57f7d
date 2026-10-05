import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KudosReportsService } from './kudos-reports.service';

const prismaMock = {
  kudos: {
    findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
  },
  kudosReport: {
    findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
    create: jest.fn<(...args: any[]) => Promise<any>>(),
  },
};
const service = new KudosReportsService(prismaMock as unknown as PrismaService);
const reporter = { id: 'member-1', role: 'MEMBER' as const };

describe('KudosReportsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.kudos.findUnique.mockResolvedValue({ id: 'kudos-1' });
    prismaMock.kudosReport.findUnique.mockResolvedValue(null);
    prismaMock.kudosReport.create.mockImplementation(async ({ data }: any) => ({
      id: 'report-1',
      ...data,
    }));
  });

  it('[AC-23] submits a valid report and rejects a duplicate by the same reporter for that kudos', async () => {
    const first = await service.createReport(
      'kudos-1',
      { reason: 'This recognition is inappropriate' },
      reporter,
    );
    expect(first).toMatchObject({
      id: 'report-1',
      kudosId: 'kudos-1',
      reporterId: reporter.id,
      reason: 'This recognition is inappropriate',
      status: 'OPEN',
    });
    expect(prismaMock.kudosReport.create).toHaveBeenCalledWith({
      data: {
        kudosId: 'kudos-1',
        reporterId: reporter.id,
        reason: 'This recognition is inappropriate',
        status: 'OPEN',
      },
    });

    prismaMock.kudosReport.findUnique.mockResolvedValue({ id: 'report-1' });
    await expect(
      service.createReport('kudos-1', { reason: 'Another report' }, reporter),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prismaMock.kudosReport.create).toHaveBeenCalledTimes(1);

    await expect(
      service.createReport('kudos-1', { reason: '' }, reporter),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createReport('kudos-1', { reason: 'x'.repeat(201) }, reporter),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createReport('kudos-1', { reason: 7 }, reporter),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

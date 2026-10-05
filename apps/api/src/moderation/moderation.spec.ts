import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModerationService } from './moderation.service';

const prismaMock = {
  kudosReport: {
    findMany: jest.fn<(...args: any[]) => Promise<any[]>>(),
  },
  $transaction: jest.fn<(...args: any[]) => Promise<any>>(),
};
const transactionMock = {
  kudosReport: {
    updateMany: jest.fn<(...args: any[]) => Promise<any>>(),
    findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
  },
  kudos: {
    update: jest.fn<(...args: any[]) => Promise<any>>(),
  },
};
const prisma = prismaMock as unknown as PrismaService;
const service = new ModerationService(prisma);
const admin = { id: 'admin-1', role: 'ADMIN' as const };
const report = {
  id: 'report-1',
  kudosId: 'kudos-1',
  reporterId: 'member-1',
  reason: 'Please review this recognition',
  status: 'OPEN',
  resolvedById: null,
  resolvedAt: null,
  createdAt: new Date('2026-06-10T12:00:00.000Z'),
  updatedAt: new Date('2026-06-10T12:00:00.000Z'),
  reporter: { id: 'member-1', displayName: 'Reporter' },
  kudos: {
    id: 'kudos-1',
    sender: { id: 'sender-1', displayName: 'Sender' },
    recipients: [{ recipient: { id: 'recipient-1', displayName: 'Recipient' } }],
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.kudosReport.findMany.mockResolvedValue([report]);
  transactionMock.kudosReport.updateMany.mockResolvedValue({ count: 1 });
  transactionMock.kudosReport.findUnique.mockResolvedValue(report);
  transactionMock.kudos.update.mockResolvedValue({ id: 'kudos-1', isHidden: true });
  prismaMock.$transaction.mockImplementation(async (callback: any) => callback(transactionMock));
});

describe('Moderation reports', () => {
  it('[AC-25] lists open reports with reporter and kudos details and permits dismissing an open report', async () => {
    const reports = await service.listOpenReports();
    expect(reports).toEqual([report]);
    expect(prismaMock.kudosReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'OPEN' },
        include: expect.objectContaining({
          reporter: expect.any(Object),
          kudos: expect.any(Object),
        }),
      }),
    );

    const dismissed = await service.resolveReport('report-1', { action: 'dismiss' }, admin);
    expect(dismissed).toEqual(report);
    expect(transactionMock.kudosReport.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'report-1', status: 'OPEN' },
        data: expect.objectContaining({
          status: 'DISMISSED',
          resolvedById: admin.id,
          resolvedAt: expect.any(Date),
        }),
      }),
    );
    expect(transactionMock.kudos.update).not.toHaveBeenCalled();

    transactionMock.kudosReport.updateMany.mockResolvedValueOnce({ count: 0 });
    transactionMock.kudosReport.findUnique.mockResolvedValueOnce({ id: 'report-1' });
    await expect(
      service.resolveReport('report-1', { action: 'hide' }, admin),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('[AC-26] hiding a report records its resolver and hides the related kudos', async () => {
    const result = await service.resolveReport('report-1', { action: 'hide' }, admin);
    expect(result).toEqual(report);
    expect(transactionMock.kudosReport.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'report-1', status: 'OPEN' },
        data: expect.objectContaining({
          status: 'HIDDEN',
          resolvedById: 'admin-1',
          resolvedAt: expect.any(Date),
        }),
      }),
    );
    expect(transactionMock.kudos.update).toHaveBeenCalledWith({
      where: { id: 'kudos-1' },
      data: { isHidden: true },
    });
  });
});

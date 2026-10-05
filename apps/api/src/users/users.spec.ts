import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

const prismaMock = {
  user: {
    findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
  },
  kudos: {
    count: jest.fn<(...args: any[]) => Promise<number>>(),
    findMany: jest.fn<(...args: any[]) => Promise<any[]>>(),
  },
};
const service = new UsersService(prismaMock as unknown as PrismaService);

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.user.findUnique.mockResolvedValue({
    id: 'colleague-1',
    displayName: 'Taylor Colleague',
    team: { id: 'team-1', name: 'Product' },
  });
  prismaMock.kudos.findMany.mockImplementation(async (args: any) => {
    if (args.distinct) {
      return [
        { companyValue: 'VALUE_B' },
        { companyValue: 'SEED' },
        { companyValue: 'VALUE_A' },
      ];
    }
    return [
      {
        id: 'visible-recent',
        message: 'A recent thanks',
        companyValue: 'VALUE_A',
        createdAt: new Date('2026-06-01T12:00:00.000Z'),
        sender: { id: 'sender-1', displayName: 'Jordan Sender' },
      },
    ];
  });
  prismaMock.kudos.count.mockImplementation(async ({ where }: any) => {
    if (where.senderId) return 4;
    if (where.companyValue === 'VALUE_A') return 2;
    if (where.companyValue === 'VALUE_B') return 3;
    return 5;
  });
});

describe('UsersService colleague profile', () => {
  it('[AC-19] returns profile summary and excludes hidden kudos from totals, values, and recent items', async () => {
    const profile = await service.getProfile('colleague-1');

    expect(profile).toEqual({
      id: 'colleague-1',
      displayName: 'Taylor Colleague',
      team: { id: 'team-1', name: 'Product' },
      receivedTotal: 5,
      sentTotal: 4,
      receivedByValue: [
        { companyValue: 'VALUE_A', count: 2 },
        { companyValue: 'VALUE_B', count: 3 },
      ],
      recentKudos: [
        expect.objectContaining({ id: 'visible-recent', companyValue: 'VALUE_A' }),
      ],
    });
    expect(prismaMock.kudos.count).toHaveBeenCalledWith({
      where: {
        isHidden: false,
        recipients: { some: { recipientId: 'colleague-1' } },
      },
    });
    expect(prismaMock.kudos.count).toHaveBeenCalledWith({
      where: { isHidden: false, senderId: 'colleague-1' },
    });
    expect(prismaMock.kudos.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isHidden: false,
          recipients: { some: { recipientId: 'colleague-1' } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 10,
      }),
    );
    expect(prismaMock.kudos.count).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ companyValue: 'SEED' }) }),
    );
  });
});

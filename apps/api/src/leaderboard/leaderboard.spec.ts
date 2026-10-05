import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '../prisma/prisma.service';
import {
  LeaderboardClock,
  LeaderboardMonthDto,
  LeaderboardService,
} from './leaderboard.service';

interface Entry {
  kudosId: string;
  recipient: { id: string; displayName: string };
  kudos: { companyValue: string; isHidden: boolean; createdAt: Date };
}

const now = new Date('2026-06-01T00:30:00.000Z');
const clock: LeaderboardClock = { now: () => now };
const prismaMock = {
  kudosRecipient: {
    findMany: jest.fn<(...args: any[]) => Promise<Entry[]>>(),
  },
};
const prisma = prismaMock as unknown as PrismaService;
const service = new LeaderboardService(prisma, clock);
let rows: Entry[];

beforeEach(() => {
  jest.clearAllMocks();
  rows = [];
  prismaMock.kudosRecipient.findMany.mockImplementation(async (args: any) => {
    const filter = args.where.kudos;
    return rows.filter((row) =>
      !row.kudos.isHidden &&
      row.kudos.createdAt >= filter.createdAt.gte &&
      row.kudos.createdAt < filter.createdAt.lt,
    );
  });
});

describe('Monthly leaderboard', () => {
  it('[AC-16] defaults to the current UTC month and queries the selected UTC month boundaries', async () => {
    rows = [
      {
        kudosId: 'june',
        recipient: { id: 'user-1', displayName: 'Ada' },
        kudos: { companyValue: 'VALUE_A', isHidden: false, createdAt: new Date('2026-06-01T00:00:00Z') },
      },
      {
        kudosId: 'may',
        recipient: { id: 'user-1', displayName: 'Ada' },
        kudos: { companyValue: 'VALUE_A', isHidden: false, createdAt: new Date('2026-05-31T23:59:59.999Z') },
      },
    ];

    const currentMonthResult = await service.getLeaderboard({});
    expect(currentMonthResult).toEqual({
      month: '2026-06',
      leaderboard: [{
        recipientId: 'user-1',
        displayName: 'Ada',
        totalKudos: 1,
        countsByValue: { VALUE_A: 1 },
      }],
    });
    expect(prismaMock.kudosRecipient.findMany).toHaveBeenLastCalledWith({
      where: {
        kudos: {
          isHidden: false,
          createdAt: {
            gte: new Date('2026-06-01T00:00:00.000Z'),
            lt: new Date('2026-07-01T00:00:00.000Z'),
          },
        },
      },
      select: {
        kudosId: true,
        recipient: { select: { id: true, displayName: true } },
        kudos: { select: { companyValue: true } },
      },
    });

    await service.getLeaderboard({ month: '2026-05' });
    expect(prismaMock.kudosRecipient.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          kudos: {
            isHidden: false,
            createdAt: {
              gte: new Date('2026-05-01T00:00:00.000Z'),
              lt: new Date('2026-06-01T00:00:00.000Z'),
            },
          },
        },
      }),
    );
    expect((await service.getLeaderboard({ month: '2026-05' })).month).toBe('2026-05');
  });

  it('[AC-17] excludes hidden kudos, counts each multi-recipient kudos once, groups supported values, and breaks ties by name', async () => {
    const june = new Date('2026-06-15T12:00:00Z');
    rows = [
      { kudosId: 'shared-a', recipient: { id: 'user-b', displayName: 'Bea' }, kudos: { companyValue: 'VALUE_A', isHidden: false, createdAt: june } },
      { kudosId: 'shared-a', recipient: { id: 'user-a', displayName: 'Ada' }, kudos: { companyValue: 'VALUE_A', isHidden: false, createdAt: june } },
      { kudosId: 'second-a', recipient: { id: 'user-a', displayName: 'Ada' }, kudos: { companyValue: 'VALUE_B', isHidden: false, createdAt: june } },
      { kudosId: 'hidden-a', recipient: { id: 'user-a', displayName: 'Ada' }, kudos: { companyValue: 'VALUE_B', isHidden: true, createdAt: june } },
      { kudosId: 'hidden-only', recipient: { id: 'user-hidden', displayName: 'Zed' }, kudos: { companyValue: 'VALUE_C', isHidden: true, createdAt: june } },
      { kudosId: 'shared-b', recipient: { id: 'user-c', displayName: 'Cal' }, kudos: { companyValue: 'VALUE_A', isHidden: false, createdAt: june } },
      { kudosId: 'shared-b', recipient: { id: 'user-b', displayName: 'Bea' }, kudos: { companyValue: 'VALUE_A', isHidden: false, createdAt: june } },
      { kudosId: 'only-c', recipient: { id: 'user-c', displayName: 'Cal' }, kudos: { companyValue: 'VALUE_C', isHidden: false, createdAt: june } },
    ];

    const result = await service.getLeaderboard({ month: '2026-06' } as LeaderboardMonthDto);
    expect(result.leaderboard).toEqual([
      { recipientId: 'user-a', displayName: 'Ada', totalKudos: 2, countsByValue: { VALUE_A: 1, VALUE_B: 1 } },
      { recipientId: 'user-b', displayName: 'Bea', totalKudos: 2, countsByValue: { VALUE_A: 2 } },
      { recipientId: 'user-c', displayName: 'Cal', totalKudos: 2, countsByValue: { VALUE_A: 1, VALUE_C: 1 } },
    ]);
    expect(result.leaderboard).toHaveLength(3);
    expect(result.leaderboard.some(({ recipientId }) => recipientId === 'user-hidden')).toBe(false);
    expect(result.leaderboard.every(({ totalKudos }) => totalKudos === 2)).toBe(true);
  });
});

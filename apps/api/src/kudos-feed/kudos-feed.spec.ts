import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '../prisma/prisma.service';
import { KudosFeedQueryDto, KudosFeedService } from './kudos-feed.service';

function item(id: string, offset: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    createdAt: new Date(Date.UTC(2026, 5, 15, 12, 0, 0) - offset * 1000),
    isHidden: false,
    companyValue: 'VALUE_A',
    recipients: [{ recipient: { id: 'recipient-a', teamId: 'team-a' } }],
    ...extra,
  };
}

function matches(row: any, where: any): boolean {
  if (where.isHidden !== undefined && row.isHidden !== where.isHidden) return false;
  if (where.companyValue !== undefined && row.companyValue !== where.companyValue) return false;
  if (where.recipients?.some) {
    const recipientWhere = where.recipients.some.recipient;
    if (!row.recipients.some(({ recipient }: any) =>
      (recipientWhere.id === undefined || recipient.id === recipientWhere.id) &&
      (recipientWhere.teamId === undefined || recipient.teamId === recipientWhere.teamId),
    )) return false;
  }
  if (where.AND) {
    for (const condition of where.AND) {
      const valid = condition.OR.some((part: any) => {
        const rowTime = row.createdAt.getTime();
        if (part.createdAt instanceof Date) {
          return rowTime === part.createdAt.getTime() &&
            (part.id.lt ? row.id < part.id.lt : row.id <= part.id.lte);
        }
        if (part.createdAt.lt) return rowTime < part.createdAt.lt.getTime();
        return false;
      });
      if (!valid) return false;
    }
  }
  return true;
}

const prismaMock = {
  kudos: { findMany: jest.fn<(...args: any[]) => Promise<any[]>>() },
};
const prisma = prismaMock as unknown as PrismaService;
const service = new KudosFeedService(prisma);
let records: any[];

beforeEach(() => {
  jest.clearAllMocks();
  records = [];
  prismaMock.kudos.findMany.mockImplementation(async ({ where, take }: any) =>
    records
      .filter((row) => matches(row, where))
      .sort((left, right) =>
        right.createdAt.getTime() - left.createdAt.getTime() || right.id.localeCompare(left.id),
      )
      .slice(0, take),
  );
});

describe('Kudos feed pagination and filtering', () => {
  it('[AC-8] defaults to 20 newest visible items, accepts 50, and rejects invalid page sizes', async () => {
    records = Array.from({ length: 55 }, (_, index) => item(`kudos-${index}`, index));
    const defaultPage = await service.list({});
    expect(defaultPage.items).toHaveLength(20);
    expect(defaultPage.items[0].id).toBe('kudos-0');
    expect(defaultPage.nextCursor).toEqual(expect.any(String));
    expect(prismaMock.kudos.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 21, where: { isHidden: false } }),
    );

    const maximumPage = await service.list({ pageSize: '50' });
    expect(maximumPage.items).toHaveLength(50);
    expect(prismaMock.kudos.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 51 }),
    );
    for (const pageSize of ['0', '51', '1.5', '-1', 'abc']) {
      await expect(service.list({ pageSize })).rejects.toMatchObject({ status: 400 });
    }
    records[0].isHidden = true;
    const withoutHidden = await service.list({ pageSize: '50' });
    expect(withoutHidden.items.every((kudos) => !kudos.isHidden)).toBe(true);
  });

  it('[AC-9] traverses a stable cursor snapshot once each while new kudos arrive', async () => {
    records = Array.from({ length: 45 }, (_, index) => item(`kudos-${index}`, index));
    const visited: string[] = [];
    let page = await service.list({ pageSize: '7' });
    visited.push(...page.items.map(({ id }) => id));
    records.push(item('arrived-after-first-page', -1));
    while (page.nextCursor) {
      page = await service.list({ pageSize: '7', cursor: page.nextCursor });
      visited.push(...page.items.map(({ id }) => id));
    }
    expect(visited).toHaveLength(45);
    expect(new Set(visited).size).toBe(45);
    expect(visited).not.toContain('arrived-after-first-page');
    expect(visited).toEqual(
      Array.from({ length: 45 }, (_, index) => `kudos-${index}`),
    );
    expect(page.nextCursor).toBeNull();
  });

  it('[AC-10] combines recipient team, company value, and recipient filters in one selection', async () => {
    records = [
      item('all-filters-match', 0, {
        companyValue: 'VALUE_B',
        recipients: [
          { recipient: { id: 'recipient-b', teamId: 'team-b' } },
          { recipient: { id: 'recipient-a', teamId: 'team-a' } },
        ],
      }),
      item('wrong-team', 1, {
        companyValue: 'VALUE_B',
        recipients: [{ recipient: { id: 'recipient-b', teamId: 'team-a' } }],
      }),
      item('wrong-value', 2, {
        companyValue: 'VALUE_A',
        recipients: [{ recipient: { id: 'recipient-b', teamId: 'team-b' } }],
      }),
      item('wrong-recipient', 3, {
        companyValue: 'VALUE_B',
        recipients: [{ recipient: { id: 'recipient-a', teamId: 'team-b' } }],
      }),
    ];
    const result = await service.list({
      recipientTeamId: 'team-b',
      companyValue: 'VALUE_B',
      recipientId: 'recipient-b',
    } as KudosFeedQueryDto);
    expect(result.items.map(({ id }) => id)).toEqual(['all-filters-match']);
    expect(prismaMock.kudos.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isHidden: false,
          companyValue: 'VALUE_B',
          recipients: { some: { recipient: { id: 'recipient-b', teamId: 'team-b' } } },
        },
      }),
    );
  });
});

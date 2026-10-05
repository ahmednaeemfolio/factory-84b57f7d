import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsClock, NotificationsService } from './notifications.service';

const prismaMock = {
  user: {
    findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
    update: jest.fn<(...args: any[]) => Promise<any>>(),
  },
  kudosRecipient: {
    count: jest.fn<(...args: any[]) => Promise<number>>(),
  },
};
const prisma = prismaMock as unknown as PrismaService;
const clockMock = { now: jest.fn<() => Date>() };
const clock = clockMock as unknown as NotificationsClock;
const service = new NotificationsService(prisma, clock);

let lastOpenedAt: Date | null;
let now: Date;
let receivedKudos: Array<{ recipientId: string; createdAt: Date; isHidden: boolean }>;

beforeEach(() => {
  jest.clearAllMocks();
  lastOpenedAt = null;
  now = new Date('2026-06-15T12:00:00.000Z');
  receivedKudos = [];
  clockMock.now.mockImplementation(() => now);
  prismaMock.user.findUnique.mockImplementation(async () => ({ lastNotificationsOpenedAt: lastOpenedAt }));
  prismaMock.user.update.mockImplementation(async ({ data }: any) => {
    lastOpenedAt = data.lastNotificationsOpenedAt;
    return { lastNotificationsOpenedAt: lastOpenedAt };
  });
  prismaMock.kudosRecipient.count.mockImplementation(async ({ where }: any) =>
    receivedKudos.filter((record) =>
      record.recipientId === where.recipientId &&
      record.isHidden === where.kudos.isHidden &&
      (!where.kudos.createdAt || record.createdAt > where.kudos.createdAt.gt),
    ).length,
  );
});

describe('Notifications seen state', () => {
  it('[AC-21] counts only non-hidden unread received kudos and advances the opening point', async () => {
    receivedKudos = [
      { recipientId: 'user-1', createdAt: new Date('2026-06-14T12:00:00.000Z'), isHidden: false },
      { recipientId: 'user-1', createdAt: new Date('2026-06-14T13:00:00.000Z'), isHidden: true },
      { recipientId: 'user-2', createdAt: new Date('2026-06-14T14:00:00.000Z'), isHidden: false },
    ];

    expect(await service.getUnreadCount('user-1')).toEqual({ count: 1 });
    expect(prismaMock.kudosRecipient.count).toHaveBeenLastCalledWith({
      where: { recipientId: 'user-1', kudos: { isHidden: false } },
    });

    expect(await service.markSeen('user-1')).toEqual({
      lastNotificationsOpenedAt: now,
    });
    expect(await service.getUnreadCount('user-1')).toEqual({ count: 0 });
    expect(prismaMock.kudosRecipient.count).toHaveBeenLastCalledWith({
      where: {
        recipientId: 'user-1',
        kudos: { isHidden: false, createdAt: { gt: now } },
      },
    });

    receivedKudos.push({
      recipientId: 'user-1',
      createdAt: new Date('2026-06-15T12:00:00.001Z'),
      isHidden: false,
    });
    expect(await service.getUnreadCount('user-1')).toEqual({ count: 1 });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { lastNotificationsOpenedAt: now },
      select: { lastNotificationsOpenedAt: true },
    });
  });
});

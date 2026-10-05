import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedAccount } from '../auth/jwt.strategy';
import { KudosInteractionsService, SetReactionDto } from './kudos-interactions.service';

const member: AuthenticatedAccount = { id: 'signed-in-user', role: 'MEMBER' };
const supportedLabelStoredByTheApplication = 'existing-reaction-label';

const prismaMock = {
  kudos: { findFirst: jest.fn<(...args: any[]) => Promise<any>>() },
  kudosReaction: {
    findMany: jest.fn<(...args: any[]) => Promise<any[]>>() ,
    findUnique: jest.fn<(...args: any[]) => Promise<any>>() ,
    create: jest.fn<(...args: any[]) => Promise<any>>() ,
    update: jest.fn<(...args: any[]) => Promise<any>>() ,
    delete: jest.fn<(...args: any[]) => Promise<any>>() ,
  },
};
const service = new KudosInteractionsService(prismaMock as unknown as PrismaService);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Kudos interactions', () => {
  it('[AC-12] lets the signed-in user toggle a supported reaction and returns the updated state', async () => {
    const activeReaction: { kudosId: string; userId: string; reactionType: string } | null = null;
    const reactions = new Map<string, { userId: string; reactionType: string }>();
    prismaMock.kudos.findFirst.mockResolvedValue({ id: 'kudos-1' });
    prismaMock.kudosReaction.findMany.mockImplementation(async (args: any) => {
      if (args.distinct) return [{ reactionType: supportedLabelStoredByTheApplication }];
      return [...reactions.values()];
    });
    prismaMock.kudosReaction.findUnique.mockImplementation(async () => activeReaction);
    prismaMock.kudosReaction.create.mockImplementation(async ({ data }: any) => {
      reactions.set(data.userId, { userId: data.userId, reactionType: data.reactionType });
      return data;
    });
    prismaMock.kudosReaction.delete.mockImplementation(async ({ where }: any) => {
      reactions.delete(where.kudosId_userId.userId);
      return {};
    });

    const dto = Object.assign(new SetReactionDto(), {
      reactionType: supportedLabelStoredByTheApplication,
    });
    const selected = await service.toggleReaction('kudos-1', dto, member);
    expect(selected).toMatchObject({
      kudosId: 'kudos-1',
      userId: member.id,
      reactionType: supportedLabelStoredByTheApplication,
      active: true,
      reacted: true,
      reactions: [{ userId: member.id, reactionType: supportedLabelStoredByTheApplication }],
    });
    expect(prismaMock.kudosReaction.create).toHaveBeenCalledWith({
      data: {
        kudosId: 'kudos-1',
        userId: member.id,
        reactionType: supportedLabelStoredByTheApplication,
      },
    });

    prismaMock.kudosReaction.findUnique.mockResolvedValue({
      kudosId: 'kudos-1',
      userId: member.id,
      reactionType: supportedLabelStoredByTheApplication,
    });
    const cleared = await service.toggleReaction('kudos-1', dto, member);
    expect(cleared).toMatchObject({
      kudosId: 'kudos-1',
      userId: member.id,
      reactionType: null,
      active: false,
      reacted: false,
      reactions: [],
    });
    expect(prismaMock.kudosReaction.delete).toHaveBeenCalledWith({
      where: { kudosId_userId: { kudosId: 'kudos-1', userId: member.id } },
    });
    const dtoErrors = await validate(Object.assign(new SetReactionDto(), { reactionType: '' }));
    expect(dtoErrors.some((error) => error.property === 'reactionType')).toBe(true);
  });

  it('returns only visible kudos with sender, recipients, reactions, comments, and the caller state', async () => {
    const record = {
      id: 'kudos-1',
      isHidden: false,
      sender: { id: 'sender', displayName: 'Sender' },
      recipients: [{ recipient: { id: 'recipient', displayName: 'Recipient' } }],
      reactions: [{ userId: member.id, reactionType: supportedLabelStoredByTheApplication }],
      comments: [{ id: 'comment-1', body: 'A comment' }],
    };
    prismaMock.kudos.findFirst.mockResolvedValueOnce(record).mockResolvedValueOnce(null);

    const detail = await service.detail('kudos-1', member);
    expect(detail).toMatchObject({
      id: 'kudos-1',
      sender: { id: 'sender' },
      recipients: [{ recipient: { id: 'recipient' } }],
      reactions: [{ userId: member.id }],
      comments: [{ id: 'comment-1' }],
      myReaction: supportedLabelStoredByTheApplication,
    });
    expect(prismaMock.kudos.findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { id: 'kudos-1', isHidden: false } }),
    );
    await expect(service.detail('missing-or-hidden', member)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('rejects a reaction value not present in the supported stored labels', async () => {
    prismaMock.kudos.findFirst.mockResolvedValue({ id: 'kudos-1' });
    prismaMock.kudosReaction.findMany.mockResolvedValue([
      { reactionType: supportedLabelStoredByTheApplication },
    ]);
    const errors = await validate(
      Object.assign(new SetReactionDto(), { reactionType: 'unsupported' }),
    );
    expect(errors).toHaveLength(0);
    await expect(
      service.toggleReaction(
        'kudos-1',
        Object.assign(new SetReactionDto(), { reactionType: 'unsupported' }),
        member,
      ),
    ).rejects.toMatchObject({ status: 422 });
  });
});

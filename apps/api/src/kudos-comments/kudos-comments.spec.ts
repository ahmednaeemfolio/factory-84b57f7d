import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KudosCommentsService } from './kudos-comments.service';

const prismaMock = {
  kudos: {
    findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
    delete: jest.fn<(...args: any[]) => Promise<any>>(),
  },
  comment: {
    findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
    create: jest.fn<(...args: any[]) => Promise<any>>(),
    delete: jest.fn<(...args: any[]) => Promise<any>>(),
  },
};
const service = new KudosCommentsService(prismaMock as unknown as PrismaService);
const author = { id: 'author-1', role: 'MEMBER' as const };
const otherMember = { id: 'member-2', role: 'MEMBER' as const };
const admin = { id: 'admin-1', role: 'ADMIN' as const };

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.kudos.findUnique.mockResolvedValue({ id: 'kudos-1' });
  prismaMock.kudos.delete.mockImplementation(async ({ where }: any) => ({ ...where }));
  prismaMock.comment.findUnique.mockResolvedValue({ id: 'comment-1', authorId: author.id });
  prismaMock.comment.create.mockImplementation(async ({ data }: any) => ({ id: 'comment-1', ...data }));
  prismaMock.comment.delete.mockImplementation(async ({ where }: any) => ({ ...where }));
});

describe('KudosCommentsService', () => {
  it('[AC-13] accepts comment bodies at both length boundaries and restricts comment deletion to its author or an admin', async () => {
    for (const text of ['x', 'x'.repeat(300)]) {
      await expect(service.createComment('kudos-1', { body: text }, author)).resolves.toMatchObject({
        kudosId: 'kudos-1',
        authorId: author.id,
        body: text,
      });
    }
    expect(prismaMock.comment.create).toHaveBeenNthCalledWith(1, {
      data: { kudosId: 'kudos-1', authorId: author.id, body: 'x' },
    });
    await expect(service.createComment('kudos-1', { body: '' }, author)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.createComment('kudos-1', { body: 'x'.repeat(301) }, author),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createComment('kudos-1', { body: 1 }, author)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    await expect(service.deleteComment('comment-1', author)).resolves.toMatchObject({
      id: 'comment-1',
    });
    await expect(service.deleteComment('comment-1', admin)).resolves.toMatchObject({
      id: 'comment-1',
    });
    await expect(service.deleteComment('comment-1', otherMember)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    prismaMock.comment.findUnique.mockResolvedValueOnce(null);
    await expect(service.deleteComment('missing-comment', author)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('[AC-14] permits a kudos sender or admin to delete kudos and denies other members', async () => {
    prismaMock.kudos.findUnique.mockResolvedValue({ id: 'kudos-1', senderId: author.id });
    await expect(service.deleteKudos('kudos-1', author)).resolves.toMatchObject({
      id: 'kudos-1',
    });
    await expect(service.deleteKudos('kudos-1', admin)).resolves.toMatchObject({
      id: 'kudos-1',
    });
    await expect(service.deleteKudos('kudos-1', otherMember)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    prismaMock.kudos.findUnique.mockResolvedValueOnce(null);
    await expect(service.deleteKudos('missing-kudos', author)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

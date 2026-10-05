import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { AuthenticatedAccount } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

export class SetReactionDto {
  @IsString()
  @IsNotEmpty()
  reactionType!: string;
}

@Injectable()
export class KudosInteractionsService {
  constructor(private readonly prisma: PrismaService) {}

  async detail(id: string, account: AuthenticatedAccount) {
    const kudos = await this.prisma.kudos.findFirst({
      where: { id, isHidden: false },
      include: {
        sender: {
          select: { id: true, displayName: true, team: { select: { id: true, name: true } } },
        },
        recipients: {
          include: {
            recipient: {
              select: { id: true, displayName: true, team: { select: { id: true, name: true } } },
            },
          },
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            reactionType: true,
            createdAt: true,
            user: { select: { id: true, displayName: true } },
          },
        },
        comments: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          include: {
            author: { select: { id: true, displayName: true } },
          },
        },
      },
    });
    if (!kudos) throw new NotFoundException('Kudos not found');

    return {
      ...kudos,
      myReaction:
        kudos.reactions.find((reaction) => reaction.userId === account.id)?.reactionType ?? null,
    };
  }

  async toggleReaction(
    kudosId: string,
    dto: SetReactionDto,
    account: AuthenticatedAccount,
  ) {
    const kudos = await this.prisma.kudos.findFirst({
      where: { id: kudosId, isHidden: false },
      select: { id: true },
    });
    if (!kudos) throw new NotFoundException('Kudos not found');

    // Reaction labels are intentionally not hard-coded: the contract has not
    // supplied their canonical names. Recognized labels are those already
    // represented in the persisted reaction data.
    const knownTypes = await this.prisma.kudosReaction.findMany({
      distinct: ['reactionType'],
      select: { reactionType: true },
    });
    if (!knownTypes.some(({ reactionType }) => reactionType === dto.reactionType)) {
      throw new UnprocessableEntityException('Unsupported reaction type');
    }

    const where = { kudosId_userId: { kudosId, userId: account.id } };
    const existing = await this.prisma.kudosReaction.findUnique({ where });
    let active: boolean;
    if (existing?.reactionType === dto.reactionType) {
      await this.prisma.kudosReaction.delete({ where });
      active = false;
    } else if (existing) {
      await this.prisma.kudosReaction.update({
        where,
        data: { reactionType: dto.reactionType },
      });
      active = true;
    } else {
      await this.prisma.kudosReaction.create({
        data: { kudosId, userId: account.id, reactionType: dto.reactionType },
      });
      active = true;
    }

    const currentReactions = await this.prisma.kudosReaction.findMany({
      where: { kudosId },
      select: { userId: true, reactionType: true },
    });
    return {
      kudosId,
      userId: account.id,
      reactionType: active ? dto.reactionType : null,
      active,
      reacted: active,
      reactions: currentReactions,
    };
  }
}

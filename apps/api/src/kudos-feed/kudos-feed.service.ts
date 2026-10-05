import { BadRequestException, Injectable } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export class KudosFeedQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  pageSize?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  recipientTeamId?: string;

  @IsOptional()
  @IsString()
  companyValue?: string;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsString()
  recipientId?: string;
}

interface CursorPosition {
  createdAt: string;
  id: string;
}

interface FeedCursor {
  boundary: CursorPosition;
  watermark: CursorPosition;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function parseCursor(token: string): FeedCursor {
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(token)) throw new Error('Malformed cursor');
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    if (Buffer.from(decoded, 'utf8').toString('base64url') !== token) {
      throw new Error('Malformed cursor');
    }
    const value: unknown = JSON.parse(decoded);
    if (!value || typeof value !== 'object') throw new Error('Malformed cursor');
    const candidate = value as Partial<FeedCursor>;
    for (const position of [candidate.boundary, candidate.watermark]) {
      if (
        !position ||
        typeof position.id !== 'string' ||
        position.id.length === 0 ||
        typeof position.createdAt !== 'string' ||
        !Number.isFinite(Date.parse(position.createdAt))
      ) {
        throw new Error('Malformed cursor');
      }
    }
    return candidate as FeedCursor;
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
}

function encodeCursor(cursor: FeedCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

@Injectable()
export class KudosFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: KudosFeedQueryDto) {
    const pageSize = this.pageSize(query.pageSize);
    const cursor = query.cursor !== undefined ? parseCursor(query.cursor) : undefined;
    const teamId = query.recipientTeamId ?? query.teamId;
    const companyValue = query.companyValue ?? query.value;

    const where: Record<string, any> = { isHidden: false };
    if (companyValue !== undefined) where.companyValue = companyValue;
    if (teamId !== undefined || query.recipientId !== undefined) {
      const recipientWhere: Record<string, any> = {};
      if (query.recipientId !== undefined) recipientWhere.id = query.recipientId;
      if (teamId !== undefined) recipientWhere.teamId = teamId;
      where.recipients = { some: { recipient: recipientWhere } };
    }
    if (cursor) {
      where.AND = [
        {
          OR: [
            { createdAt: { lt: new Date(cursor.boundary.createdAt) } },
            {
              createdAt: new Date(cursor.boundary.createdAt),
              id: { lt: cursor.boundary.id },
            },
          ],
        },
        {
          OR: [
            { createdAt: { lt: new Date(cursor.watermark.createdAt) } },
            {
              createdAt: new Date(cursor.watermark.createdAt),
              id: { lte: cursor.watermark.id },
            },
          ],
        },
      ];
    }

    const rows = await this.prisma.kudos.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
      include: {
        sender: true,
        recipients: { include: { recipient: { include: { team: true } } } },
      },
    });

    const hasMore = rows.length > pageSize;
    const items = hasMore ? rows.slice(0, pageSize) : rows;
    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const watermark = cursor?.watermark ?? {
        createdAt: new Date(items[0].createdAt).toISOString(),
        id: items[0].id,
      };
      const last = items[items.length - 1];
      nextCursor = encodeCursor({
        watermark,
        boundary: {
          createdAt: new Date(last.createdAt).toISOString(),
          id: last.id,
        },
      });
    }

    return { items, nextCursor };
  }

  private pageSize(rawSize?: string): number {
    if (rawSize === undefined) return DEFAULT_PAGE_SIZE;
    if (!/^\d+$/.test(rawSize)) {
      throw new BadRequestException('Page size must be an integer from 1 to 50');
    }
    const size = Number(rawSize);
    if (!Number.isSafeInteger(size) || size < 1 || size > MAX_PAGE_SIZE) {
      throw new BadRequestException('Page size must be an integer from 1 to 50');
    }
    return size;
  }
}

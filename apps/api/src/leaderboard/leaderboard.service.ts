import { Inject, Injectable } from '@nestjs/common';
import { IsOptional, Matches } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export interface LeaderboardClock {
  now(): Date;
}

export const LEADERBOARD_CLOCK = Symbol('LEADERBOARD_CLOCK');

@Injectable()
export class SystemLeaderboardClock implements LeaderboardClock {
  now(): Date {
    return new Date();
  }
}

export class LeaderboardMonthDto {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in YYYY-MM format',
  })
  month?: string;
}

export interface LeaderboardRecipient {
  recipientId: string;
  displayName: string;
  totalKudos: number;
  countsByValue: Record<string, number>;
}

export interface LeaderboardResult {
  month: string;
  leaderboard: LeaderboardRecipient[];
}

interface RecipientKudosEntry {
  kudosId: string;
  recipient: { id: string; displayName: string };
  kudos: { companyValue: string };
}

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LEADERBOARD_CLOCK) private readonly clock: LeaderboardClock,
  ) {}

  async getLeaderboard(query: LeaderboardMonthDto): Promise<LeaderboardResult> {
    const currentTime = this.clock.now();
    const month = query.month ?? this.formatMonth(currentTime);
    const [year, monthNumber] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, monthNumber - 1, 1));
    const end = new Date(Date.UTC(year, monthNumber, 1));

    const entries = (await this.prisma.kudosRecipient.findMany({
      where: {
        kudos: {
          isHidden: false,
          createdAt: { gte: start, lt: end },
        },
      },
      select: {
        kudosId: true,
        recipient: { select: { id: true, displayName: true } },
        kudos: { select: { companyValue: true } },
      },
    })) as RecipientKudosEntry[];

    const totals = new Map<string, LeaderboardRecipient>();
    const countedKudos = new Map<string, Set<string>>();
    for (const entry of entries) {
      let aggregate = totals.get(entry.recipient.id);
      if (!aggregate) {
        aggregate = {
          recipientId: entry.recipient.id,
          displayName: entry.recipient.displayName,
          totalKudos: 0,
          countsByValue: {},
        };
        totals.set(entry.recipient.id, aggregate);
        countedKudos.set(entry.recipient.id, new Set<string>());
      }

      const recipientKudos = countedKudos.get(entry.recipient.id)!;
      if (recipientKudos.has(entry.kudosId)) continue;
      recipientKudos.add(entry.kudosId);
      aggregate.totalKudos += 1;
      aggregate.countsByValue[entry.kudos.companyValue] =
        (aggregate.countsByValue[entry.kudos.companyValue] ?? 0) + 1;
    }

    const leaderboard = Array.from(totals.values())
      .sort(
        (left, right) =>
          right.totalKudos - left.totalKudos ||
          left.displayName.localeCompare(right.displayName, 'en') ||
          left.recipientId.localeCompare(right.recipientId),
      )
      .slice(0, 10);

    return { month, leaderboard };
  }

  private formatMonth(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }
}

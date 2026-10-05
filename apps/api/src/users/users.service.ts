import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PLACEHOLDER_VALUE = 'SEED';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        team: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [receivedTotal, sentTotal, valueRows, recentKudos] = await Promise.all([
      this.prisma.kudos.count({
        where: {
          isHidden: false,
          recipients: { some: { recipientId: id } },
        },
      }),
      this.prisma.kudos.count({
        where: { isHidden: false, senderId: id },
      }),
      this.prisma.kudos.findMany({
        distinct: ['companyValue'],
        select: { companyValue: true },
      }),
      this.prisma.kudos.findMany({
        where: {
          isHidden: false,
          recipients: { some: { recipientId: id } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 10,
        include: {
          sender: { select: { id: true, displayName: true } },
        },
      }),
    ]);

    // Value labels are taken from stored application data; the seed marker is not
    // a supported value and must not appear as a public label or count.
    const supportedValues = valueRows
      .map(({ companyValue }) => companyValue)
      .filter((companyValue) => companyValue !== PLACEHOLDER_VALUE)
      .sort((left, right) => left.localeCompare(right));

    const receivedByValue = await Promise.all(
      supportedValues.map(async (companyValue) => ({
        companyValue,
        count: await this.prisma.kudos.count({
          where: {
            isHidden: false,
            companyValue,
            recipients: { some: { recipientId: id } },
          },
        }),
      })),
    );

    return {
      id: user.id,
      displayName: user.displayName,
      team: user.team,
      receivedTotal,
      sentTotal,
      receivedByValue,
      recentKudos,
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsClock {
  now(): Date {
    return new Date();
  }
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: NotificationsClock,
  ) {}

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lastNotificationsOpenedAt: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const count = await this.prisma.kudosRecipient.count({
      where: {
        recipientId: userId,
        kudos: {
          isHidden: false,
          ...(user.lastNotificationsOpenedAt
            ? { createdAt: { gt: user.lastNotificationsOpenedAt } }
            : {}),
        },
      },
    });
    return { count };
  }

  async markSeen(userId: string): Promise<{ lastNotificationsOpenedAt: Date }> {
    const lastNotificationsOpenedAt = this.clock.now();
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastNotificationsOpenedAt },
      select: { lastNotificationsOpenedAt: true },
    });
    return { lastNotificationsOpenedAt };
  }
}

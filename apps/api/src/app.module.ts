import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { KudosCommentsModule } from './kudos-comments/kudos-comments.module';
import { KudosCreateModule } from './kudos-create/kudos-create.module';
import { KudosFeedModule } from './kudos-feed/kudos-feed.module';
import { KudosInteractionsModule } from './kudos-interactions/kudos-interactions.module';
import { KudosReportsModule } from './kudos-reports/kudos-reports.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { ModerationModule } from './moderation/moderation.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { TeamsModule } from './teams/teams.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TeamsModule,
    KudosCreateModule,
    KudosFeedModule,
    KudosInteractionsModule,
    KudosCommentsModule,
    LeaderboardModule,
    UsersModule,
    NotificationsModule,
    KudosReportsModule,
    ModerationModule,
  ],
})
export class AppModule {}

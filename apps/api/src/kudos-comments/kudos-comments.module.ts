import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtStrategy } from '../auth/jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import {
  CommentController,
  KudosCommentsController,
} from './kudos-comments.controller';
import { KudosCommentsService } from './kudos-comments.service';

@Module({
  imports: [PrismaModule],
  controllers: [KudosCommentsController, CommentController],
  providers: [KudosCommentsService, JwtAuthGuard, JwtStrategy],
  exports: [KudosCommentsService],
})
export class KudosCommentsModule {}

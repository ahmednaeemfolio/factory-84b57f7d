import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedAccount } from '../auth/jwt.strategy';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KudosCommentsService } from './kudos-comments.service';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedAccount;
}

@Controller('kudos')
@UseGuards(JwtAuthGuard)
export class KudosCommentsController {
  constructor(private readonly kudosCommentsService: KudosCommentsService) {}

  @Post(':id/comments')
  createComment(
    @Param('id') kudosId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.kudosCommentsService.createComment(kudosId, body, request.user);
  }

  @Delete(':id')
  deleteKudos(
    @Param('id') kudosId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.kudosCommentsService.deleteKudos(kudosId, request.user);
  }
}

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentController {
  constructor(private readonly kudosCommentsService: KudosCommentsService) {}

  @Delete(':id')
  deleteComment(
    @Param('id') commentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.kudosCommentsService.deleteComment(commentId, request.user);
  }
}

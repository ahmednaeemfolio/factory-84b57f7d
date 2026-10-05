import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedAccount } from '../auth/jwt.strategy';
import { NotificationsService } from './notifications.service';

interface AuthenticatedRequest {
  user: AuthenticatedAccount;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('unread-count')
  getUnreadCount(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.getUnreadCount(request.user.id);
  }

  @Post('seen')
  markSeen(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.markSeen(request.user.id);
  }
}

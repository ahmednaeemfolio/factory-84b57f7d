import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, PublicAccount } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthenticatedAccount } from './jwt.strategy';
import { Public } from './public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedAccount;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() input: RegisterDto): Promise<PublicAccount> {
    return this.authService.register(input);
  }

  @Public()
  @Post('login')
  login(@Body() input: LoginDto): Promise<{ token: string }> {
    return this.authService.login(input);
  }
}

@Controller('users')
export class AuthenticatedUsersController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() request: AuthenticatedRequest): Promise<PublicAccount> {
    return this.authService.getProfile(request.user.id);
  }
}

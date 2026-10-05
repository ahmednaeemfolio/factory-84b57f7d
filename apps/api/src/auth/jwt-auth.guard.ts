import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AuthenticatedAccount, JwtStrategy } from './jwt.strategy';

interface AuthenticatedRequest {
  headers?: { authorization?: unknown };
  user?: AuthenticatedAccount;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtStrategy: JwtStrategy,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    try {
      request.user = this.jwtStrategy.authenticate(request.headers?.authorization);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}

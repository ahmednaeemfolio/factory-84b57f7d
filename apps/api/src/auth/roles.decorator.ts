import { SetMetadata } from '@nestjs/common';
import { AccountRole } from './jwt.strategy';

export const ROLES_KEY = 'roles';

/** Restricts a handler or controller to one or more account roles. */
export const Roles = (...roles: AccountRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);

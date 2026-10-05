import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

export type AccountRole = 'MEMBER' | 'ADMIN';

export interface AuthenticatedAccount {
  id: string;
  role: AccountRole;
}

interface JwtPayload {
  sub?: unknown;
  id?: unknown;
  role?: unknown;
  exp?: unknown;
  nbf?: unknown;
}

/** Validates the HS256 bearer tokens used by the API and normalizes the account claims. */
@Injectable()
export class JwtStrategy {
  private readonly secret = process.env.JWT_SECRET ?? 'dev-secret';

  authenticate(authorization: unknown): AuthenticatedAccount {
    if (typeof authorization !== 'string') {
      throw new UnauthorizedException();
    }

    const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
    if (!match) {
      throw new UnauthorizedException();
    }

    const [encodedHeader, encodedPayload, encodedSignature, ...extra] =
      match[1].split('.');
    if (!encodedHeader || !encodedPayload || !encodedSignature || extra.length) {
      throw new UnauthorizedException();
    }

    let header: unknown;
    let payload: unknown;
    try {
      header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
      payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    } catch {
      throw new UnauthorizedException();
    }

    if (!header || typeof header !== 'object' || (header as { alg?: unknown }).alg !== 'HS256') {
      throw new UnauthorizedException();
    }

    const expected = createHmac('sha256', this.secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest();
    let actual: Buffer;
    try {
      actual = Buffer.from(encodedSignature, 'base64url');
    } catch {
      throw new UnauthorizedException();
    }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException();
    }

    return this.validate(payload);
  }

  /** Maps the verified JWT claims to the account identity attached to request.user. */
  validate(payload: unknown): AuthenticatedAccount {
    if (!payload || typeof payload !== 'object') {
      throw new UnauthorizedException();
    }

    const claims = payload as JwtPayload;
    const id = typeof claims.sub === 'string' ? claims.sub : claims.id;
    if (
      typeof id !== 'string' ||
      id.length === 0 ||
      (claims.role !== 'MEMBER' && claims.role !== 'ADMIN')
    ) {
      throw new UnauthorizedException();
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (
      (claims.exp !== undefined &&
        (typeof claims.exp !== 'number' || nowInSeconds >= claims.exp)) ||
      (claims.nbf !== undefined &&
        (typeof claims.nbf !== 'number' || nowInSeconds < claims.nbf))
    ) {
      throw new UnauthorizedException();
    }

    return { id, role: claims.role };
  }
}

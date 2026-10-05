import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const bcrypt = require('bcryptjs') as {
  hash(password: string, rounds: number): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
};

export interface PublicAccount {
  id: string;
  email: string;
  displayName: string;
  role: 'MEMBER' | 'ADMIN';
  teamId: string;
}

@Injectable()
export class AuthService {
  private readonly jwtSecret = process.env.JWT_SECRET ?? 'dev-secret';

  constructor(private readonly prisma: PrismaService) {}

  async register(input: RegisterDto): Promise<PublicAccount> {
    const team = await this.prisma.team.findUnique({
      where: { id: input.teamId },
      select: { id: true },
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        displayName: input.displayName,
        teamId: team.id,
        // Public registration must never accept or assign an elevated role.
        role: 'MEMBER',
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        teamId: true,
      },
    });
    return user;
  }

  async login(input: LoginDto): Promise<{ token: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        passwordHash: true,
        role: true,
      },
    });

    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    const header = this.base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = this.base64Url(
      JSON.stringify({
        sub: user.id,
        role: user.role,
        iat: issuedAt,
        exp: issuedAt + 60 * 60 * 24 * 7,
      }),
    );
    const unsignedToken = `${header}.${payload}`;
    const signature = createHmac('sha256', this.jwtSecret)
      .update(unsignedToken)
      .digest('base64url');
    return { token: `${unsignedToken}.${signature}` };
  }

  async getProfile(id: string): Promise<PublicAccount> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        teamId: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private base64Url(value: string): string {
    return Buffer.from(value).toString('base64url');
  }
}

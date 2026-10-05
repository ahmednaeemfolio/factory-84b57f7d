import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

jest.mock(
  'bcryptjs',
  () => ({
    hash: jest.fn<() => Promise<string>>().mockResolvedValue('bcrypt-hash'),
    compare: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
  }),
  { virtual: true },
);

const bcrypt = require('bcryptjs') as {
  hash: (...args: unknown[]) => unknown;
  compare: (...args: unknown[]) => unknown;
};

const prismaMock = {
  team: { findUnique: jest.fn<(...args: any[]) => Promise<any>>() },
  user: {
    create: jest.fn<(...args: any[]) => Promise<any>>(),
    findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
  },
};
const prisma = prismaMock as unknown as PrismaService;

describe('AuthService', () => {
  const authService = new AuthService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[AC-1] registers only a MEMBER and omits credential material', async () => {
    prismaMock.team.findUnique.mockResolvedValue({ id: 'team-1' });
    prismaMock.user.create.mockImplementation(async ({ data }) => ({
      id: 'user-1',
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      teamId: data.teamId,
    }));

    const account = await authService.register({
      email: 'member@example.com',
      password: 'test-password',
      displayName: 'New Member',
      teamId: 'team-1',
    });

    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'MEMBER',
          passwordHash: 'bcrypt-hash',
        }),
        select: expect.not.objectContaining({ passwordHash: true }),
      }),
    );
    expect(account).toEqual({
      id: 'user-1',
      email: 'member@example.com',
      displayName: 'New Member',
      role: 'MEMBER',
      teamId: 'team-1',
    });
    expect(account).not.toHaveProperty('passwordHash');
    expect(account.role).not.toBe('ADMIN');
    expect(bcrypt.hash).toHaveBeenCalledWith(expect.any(String), 10);
  });

  it("[AC-2] returns a login token that authenticates the user's profile and role", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 'user-2',
        passwordHash: 'bcrypt-hash',
        role: 'MEMBER',
      })
      .mockResolvedValueOnce({
        id: 'user-2',
        email: 'signed-in@example.com',
        displayName: 'Signed In',
        role: 'MEMBER',
        teamId: 'team-2',
      });

    const result = await authService.login({
      email: 'signed-in@example.com',
      password: 'test-password',
    });
    const identity = new JwtStrategy().authenticate(`Bearer ${result.token}`);
    const profile = await authService.getProfile(identity.id);

    expect(result.token).toEqual(expect.any(String));
    expect(result.token.split('.')).toHaveLength(3);
    expect(bcrypt.compare).toHaveBeenCalledWith(expect.any(String), 'bcrypt-hash');
    expect(identity).toEqual({ id: 'user-2', role: 'MEMBER' });
    expect(profile).toEqual({
      id: 'user-2',
      email: 'signed-in@example.com',
      displayName: 'Signed In',
      role: 'MEMBER',
      teamId: 'team-2',
    });
    expect(profile).not.toHaveProperty('passwordHash');
  });
});

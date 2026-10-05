import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard } from '../auth/roles.guard';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

const prismaMock = {
  team: {
    findMany: jest.fn<(...args: any[]) => Promise<any>>(),
    create: jest.fn<(...args: any[]) => Promise<any>>(),
    update: jest.fn<(...args: any[]) => Promise<any>>(),
  },
};
const prisma = prismaMock as unknown as PrismaService;

describe('Teams', () => {
  const service = new TeamsService(prisma);
  const controller = new TeamsController(service);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[AC-28] admin creates and renames unique teams while authenticated users list teams', async () => {
    const created = { id: 'team-1', name: 'Engineering' };
    const renamed = { id: 'team-1', name: 'Product' };
    prismaMock.team.create.mockResolvedValue(created);
    prismaMock.team.update.mockResolvedValue(renamed);
    prismaMock.team.findMany.mockResolvedValue([renamed]);

    await expect(controller.create({ name: 'Engineering' })).resolves.toEqual(created);
    await expect(controller.update('team-1', { name: 'Product' })).resolves.toEqual(renamed);
    await expect(controller.list()).resolves.toEqual([renamed]);

    expect(prismaMock.team.create).toHaveBeenCalledWith({ data: { name: 'Engineering' } });
    expect(prismaMock.team.update).toHaveBeenCalledWith({
      where: { id: 'team-1' },
      data: { name: 'Product' },
    });
    expect(prismaMock.team.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
    expect(Reflect.getMetadata('roles', TeamsController.prototype.create)).toEqual(['ADMIN']);
    expect(Reflect.getMetadata('__guards__', TeamsController.prototype.create)).toContain(RolesGuard);
    expect(Reflect.getMetadata('__guards__', TeamsController)).toBeDefined();

    prismaMock.team.create.mockRejectedValueOnce({ code: 'P2002' });
    await expect(service.create({ name: 'Engineering' })).rejects.toBeInstanceOf(ConflictException);
    prismaMock.team.update.mockRejectedValueOnce({ code: 'P2002' });
    await expect(service.update('team-1', { name: 'Product' })).rejects.toBeInstanceOf(ConflictException);
  });
});

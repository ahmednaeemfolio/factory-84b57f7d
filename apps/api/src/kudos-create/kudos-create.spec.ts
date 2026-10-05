import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKudosDto } from './dto/create-kudos.dto';
import {
  DAILY_KUDOS_LIMIT_MESSAGE,
  KudosCreateService,
} from './kudos-create.service';

const FIXED_NOW = new Date('2026-04-12T08:30:00.000Z');
const VALID_VALUE = 'VALUE_FROM_DATA';
const transactionMock = {
  kudos: {
    count: jest.fn<(...args: any[]) => Promise<number>>(),
    create: jest.fn<(...args: any[]) => Promise<any>>(),
  },
};
const prismaMock = {
  kudos: {
    findMany: jest.fn<(...args: any[]) => Promise<any[]>>(),
    create: jest.fn<(...args: any[]) => Promise<any>>(),
  },
  user: {
    findMany: jest.fn<(...args: any[]) => Promise<any[]>>(),
  },
  $transaction: jest.fn<(...args: any[]) => Promise<any>>(),
};
const prisma = prismaMock as unknown as PrismaService;
const service = new KudosCreateService(prisma, { now: () => new Date(FIXED_NOW) });
const member = { id: 'sender-1', role: 'MEMBER' as const };
const admin = { id: 'admin-1', role: 'ADMIN' as const };
const validInput: CreateKudosDto = {
  recipientIds: ['recipient-1', 'recipient-2'],
  message: 'Thank you for the thoughtful help.',
  companyValue: VALID_VALUE,
};

function dtoWith(changes: Record<string, unknown> = {}): CreateKudosDto {
  return Object.assign(new CreateKudosDto(), validInput, changes);
}

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.kudos.findMany.mockResolvedValue([{ companyValue: VALID_VALUE }]);
  prismaMock.user.findMany.mockResolvedValue([
    { id: 'recipient-1' },
    { id: 'recipient-2' },
  ]);
  prismaMock.$transaction.mockImplementation(async (callback: any) =>
    callback(transactionMock),
  );
  transactionMock.kudos.count.mockResolvedValue(0);
  transactionMock.kudos.create.mockImplementation(async ({ data }: any) => ({
    id: 'created-kudos',
    ...data,
    recipients: data.recipients.create.map((recipient: any) => ({
      kudosId: 'created-kudos',
      ...recipient,
    })),
  }));
  prismaMock.kudos.create.mockImplementation(async ({ data }: any) => ({
    id: 'created-kudos',
    ...data,
    recipients: data.recipients.create,
  }));
});

describe('KudosCreateService and CreateKudosDto', () => {
  it('[AC-4] creates valid kudos and rejects every invalid recipient, message, or value input', async () => {
    const created = await service.create(validInput, member);
    expect(created.id).toBe('created-kudos');
    expect(created.recipients).toHaveLength(2);
    expect(transactionMock.kudos.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          senderId: member.id,
          message: validInput.message,
          companyValue: VALID_VALUE,
          recipients: {
            create: [{ recipientId: 'recipient-1' }, { recipientId: 'recipient-2' }],
          },
        }),
        include: { recipients: true },
      }),
    );

    for (const recipientIds of [
      [],
      ['one', 'two', 'three', 'four', 'five', 'six'],
      ['duplicate', 'duplicate'],
      [''],
      [7],
    ]) {
      const errors = await validate(dtoWith({ recipientIds }));
      expect(errors.some((error) => error.property === 'recipientIds')).toBe(true);
    }
    for (const message of ['', 'x'.repeat(501), 25]) {
      const errors = await validate(dtoWith({ message }));
      expect(errors.some((error) => error.property === 'message')).toBe(true);
    }
    for (const companyValue of ['', 42, undefined]) {
      const errors = await validate(dtoWith({ companyValue }));
      expect(errors.some((error) => error.property === 'companyValue')).toBe(true);
    }
    const extraFieldErrors = await validate(
      dtoWith({ unexpected: 'not allowed' }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    expect(extraFieldErrors.some((error) => error.property === 'unexpected')).toBe(true);

    await expect(service.create(dtoWith({ recipientIds: [member.id] }), member))
      .rejects.toMatchObject({ status: 422 });
    prismaMock.kudos.findMany.mockResolvedValueOnce([]);
    await expect(service.create(validInput, member)).rejects.toMatchObject({ status: 422 });
  });

  it('[AC-6] applies the five-send UTC-day boundary and exempts admins from HTTP 429', async () => {
    transactionMock.kudos.count.mockResolvedValueOnce(4);
    await expect(service.create(validInput, member)).resolves.toMatchObject({
      id: 'created-kudos',
    });
    expect(transactionMock.kudos.count).toHaveBeenLastCalledWith({
      where: {
        senderId: member.id,
        createdAt: {
          gte: new Date('2026-04-12T00:00:00.000Z'),
          lt: new Date('2026-04-13T00:00:00.000Z'),
        },
      },
    });

    transactionMock.kudos.count.mockResolvedValueOnce(5);
    let limitError: any;
    try {
      await service.create(validInput, member);
    } catch (error) {
      limitError = error;
    }
    expect(limitError.getStatus()).toBe(429);
    expect(limitError.message).toBe(DAILY_KUDOS_LIMIT_MESSAGE);

    await expect(service.create(validInput, admin)).resolves.toMatchObject({
      id: 'created-kudos',
    });
    expect(prismaMock.kudos.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
  });
});

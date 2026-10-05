import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedAccount } from '../auth/jwt.strategy';
import { CreateKudosDto } from './dto/create-kudos.dto';

export interface Clock {
  now(): Date;
}

export const KUDOS_CLOCK = Symbol('KUDOS_CLOCK');
export const DAILY_KUDOS_LIMIT = 5;
export const DAILY_KUDOS_LIMIT_MESSAGE = 'Daily kudos sending limit reached';

@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

@Injectable()
export class KudosCreateService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(KUDOS_CLOCK) private readonly clock: Clock,
  ) {}

  async create(dto: CreateKudosDto, sender: AuthenticatedAccount) {
    if (new Set(dto.recipientIds).size !== dto.recipientIds.length) {
      throw new UnprocessableEntityException('Recipient IDs must be distinct');
    }
    if (dto.recipientIds.includes(sender.id)) {
      throw new UnprocessableEntityException('A sender cannot be their own recipient');
    }

    const supportedValues = await this.prisma.kudos.findMany({
      distinct: ['companyValue'],
      select: { companyValue: true },
    });
    // Seed data uses SEED only as an explicit placeholder, not as a company value.
    const knownValues = supportedValues
      .map(({ companyValue }) => companyValue)
      .filter((value) => value !== 'SEED');
    if (!knownValues.includes(dto.companyValue)) {
      throw new UnprocessableEntityException('Unsupported company value');
    }

    const recipients = await this.prisma.user.findMany({
      where: { id: { in: dto.recipientIds } },
      select: { id: true },
    });
    if (recipients.length !== dto.recipientIds.length) {
      throw new UnprocessableEntityException('One or more recipients do not exist');
    }

    const now = this.clock.now();
    if (sender.role === 'MEMBER') {
      const utcStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      const utcEnd = new Date(utcStart.getTime() + 24 * 60 * 60 * 1000);

      return this.prisma.$transaction(async (transaction) => {
        const sentToday = await transaction.kudos.count({
          where: {
            senderId: sender.id,
            createdAt: { gte: utcStart, lt: utcEnd },
          },
        });
        if (sentToday >= DAILY_KUDOS_LIMIT) {
          throw new HttpException(
            DAILY_KUDOS_LIMIT_MESSAGE,
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        return transaction.kudos.create({
          data: {
            senderId: sender.id,
            message: dto.message,
            companyValue: dto.companyValue,
            createdAt: now,
            recipients: {
              create: dto.recipientIds.map((recipientId) => ({ recipientId })),
            },
          },
          include: { recipients: true },
        });
      });
    }

    return this.prisma.kudos.create({
      data: {
        senderId: sender.id,
        message: dto.message,
        companyValue: dto.companyValue,
        createdAt: now,
        recipients: {
          create: dto.recipientIds.map((recipientId) => ({ recipientId })),
        },
      },
      include: { recipients: true },
    });
  }
}

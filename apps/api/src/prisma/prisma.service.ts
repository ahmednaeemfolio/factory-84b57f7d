import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Connect once when the application module is initialized.
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  // Release the shared database connection when Nest tears down the module.
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

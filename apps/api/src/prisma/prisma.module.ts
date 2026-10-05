import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// One shared client is available to API feature modules through Nest injection.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

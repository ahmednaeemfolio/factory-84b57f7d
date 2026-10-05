import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtStrategy } from '../auth/jwt.strategy';
import { RolesGuard } from '../auth/roles.guard';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [PrismaModule],
  controllers: [TeamsController],
  providers: [TeamsService, JwtAuthGuard, JwtStrategy, RolesGuard],
  exports: [TeamsService],
})
export class TeamsModule {}

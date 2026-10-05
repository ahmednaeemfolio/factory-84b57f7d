import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamDto } from './dto/team.dto';

interface PrismaError {
  code?: string;
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === 'object' && (error as PrismaError).code === code);
}

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.team.findMany({ orderBy: { name: 'asc' } });
  }

  async create(input: TeamDto) {
    try {
      return await this.prisma.team.create({ data: { name: input.name } });
    } catch (error) {
      if (hasPrismaCode(error, 'P2002')) {
        throw new ConflictException('A team with this name already exists');
      }
      throw error;
    }
  }

  async update(id: string, input: TeamDto) {
    try {
      return await this.prisma.team.update({
        where: { id },
        data: { name: input.name },
      });
    } catch (error) {
      if (hasPrismaCode(error, 'P2002')) {
        throw new ConflictException('A team with this name already exists');
      }
      if (hasPrismaCode(error, 'P2025')) {
        throw new NotFoundException('Team not found');
      }
      throw error;
    }
  }
}

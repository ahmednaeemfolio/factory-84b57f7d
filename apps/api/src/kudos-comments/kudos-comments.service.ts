import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthenticatedAccount } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class KudosCommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createComment(
    kudosId: string,
    body: unknown,
    author: AuthenticatedAccount,
  ) {
    const dto = plainToInstance(CreateCommentDto, body);
    const validationErrors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (validationErrors.length > 0) {
      throw new BadRequestException(
        'Comment body must be a string containing 1 to 300 characters',
      );
    }

    const kudos = await this.prisma.kudos.findUnique({
      where: { id: kudosId },
      select: { id: true },
    });
    if (!kudos) throw new NotFoundException('Kudos not found');

    return this.prisma.comment.create({
      data: {
        kudosId,
        authorId: author.id,
        body: dto.body,
      },
    });
  }

  async deleteComment(commentId: string, requester: AuthenticatedAccount) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== requester.id && requester.role !== 'ADMIN') {
      throw new ForbiddenException();
    }

    return this.prisma.comment.delete({ where: { id: commentId } });
  }

  async deleteKudos(kudosId: string, requester: AuthenticatedAccount) {
    const kudos = await this.prisma.kudos.findUnique({
      where: { id: kudosId },
      select: { id: true, senderId: true },
    });
    if (!kudos) throw new NotFoundException('Kudos not found');
    if (kudos.senderId !== requester.id && requester.role !== 'ADMIN') {
      throw new ForbiddenException();
    }

    return this.prisma.kudos.delete({ where: { id: kudosId } });
  }
}

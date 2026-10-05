import { IsString, Length } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @Length(1, 300)
  body!: string;
}

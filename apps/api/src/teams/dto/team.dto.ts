import { IsString, Length } from 'class-validator';

export class TeamDto {
  @IsString()
  @Length(2, 40)
  name!: string;
}

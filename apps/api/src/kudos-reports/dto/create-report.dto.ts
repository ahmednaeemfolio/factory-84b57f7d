import { IsString, Length } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @Length(1, 200)
  reason!: string;
}

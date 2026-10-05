import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
  Length,
} from 'class-validator';

export class CreateKudosDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  recipientIds!: string[];

  @IsString()
  @Length(1, 500)
  message!: string;

  // Supported values are resolved against the values currently present in the
  // data store; the canonical company-value labels have not been specified.
  @IsString()
  @IsNotEmpty()
  companyValue!: string;
}

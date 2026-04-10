import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type, Transform, plainToInstance } from 'class-transformer';

class SizeOptionDto {
  @IsString()
  name!: string;

  @Type(() => Number)
  @IsNumber()
  price!: number;
}

class ChoiceOptionDto {
  @IsString()
  name!: string;

  @Type(() => Number)
  @IsNumber()
  price!: number;
}

class AddOnDto {
  @IsString()
  name!: string;

  @Type(() => Number)
  @IsNumber()
  price!: number;
}

function parseAndTransform<T>(value: any, cls: new () => T): T[] {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;

    const result = plainToInstance(cls, parsed);

    return Array.isArray(result) ? result : [result]; 
  } catch {
    return [];
  }
}

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @Type(() => Number)
  @IsNumber()
  price!: number;

  @Type(() => Number)
  @IsNumber()
  estimateCookTime!: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => parseAndTransform(value, SizeOptionDto))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SizeOptionDto)
  sizeOptions?: SizeOptionDto[];

  @IsOptional()
  @Transform(({ value }) => parseAndTransform(value, ChoiceOptionDto))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChoiceOptionDto)
  choiceOptions?: ChoiceOptionDto[];

  @IsOptional()
  @Transform(({ value }) => parseAndTransform(value, AddOnDto))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddOnDto)
  addOns?: AddOnDto[];
}
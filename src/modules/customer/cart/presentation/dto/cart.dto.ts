import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
} from 'class-validator';

export class AddToCartDto {
  @IsString()
  productId!: string;

  @IsNumber()
  quantity!: number;

  @IsOptional()
  @IsString()
  sizeOptionId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  choiceOptionIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addOnIds?: string[];
}
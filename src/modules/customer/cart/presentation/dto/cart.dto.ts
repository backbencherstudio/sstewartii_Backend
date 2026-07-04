import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

export class AddCartItemPayloadDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsUUID()
  sizeOptionId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  choiceOptionIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  addOnIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class AddCartItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AddCartItemPayloadDto)
  items!: AddCartItemPayloadDto[];
}

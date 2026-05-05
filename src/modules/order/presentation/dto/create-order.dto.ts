import { IsEnum, IsOptional, IsString, MaxLength, IsUUID } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreateOrderDto {
  @IsUUID()
  cartId!: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
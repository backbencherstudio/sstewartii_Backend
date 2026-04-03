import { IsNotEmpty, IsString } from 'class-validator';

export class UploadVerificationDto {
  @IsString()
  @IsNotEmpty()
  businessLicense!: string;

  @IsString()
  @IsNotEmpty()
  healthPermit!: string;

  @IsString()
  @IsNotEmpty()
  insuranceProof!: string;
}
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IOtpRepository } from '../../domain/interfaces/otp.repository.interface';

@Injectable()
export class OtpRepository implements IOtpRepository {

    constructor(private readonly prisma: PrismaService){}

    async create(userId: string, otpHash: string, type: string, expiresAt: Date): Promise<void> {
         await this.prisma.otp.create({
            data: { 
                userId,
                otp: otpHash,
                type, 
                expiresAt, 
            },
         });
    }
}
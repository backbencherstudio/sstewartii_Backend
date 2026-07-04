import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IOtpRepository } from '../../domain/interfaces/otp.repository.interface';

@Injectable()
export class OtpRepository implements IOtpRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    otpHash: string,
    type: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.otp.create({
      data: {
        userId,
        otp: otpHash,
        type,
        expiresAt,
      },
    });
  }

  async findLatest(
    userId: string,
    type: string,
  ): Promise<{ otp: string; expiresAt: Date } | null> {
    const record = await this.prisma.otp.findFirst({
      where: { userId, type },
      orderBy: { createdAt: 'desc' },
      select: { otp: true, expiresAt: true },
    });

    return record;
  }

  async deleteUserOtps(userId: string, type: string): Promise<void> {
    await this.prisma.otp.deleteMany({
      where: { userId, type },
    });
  }
}

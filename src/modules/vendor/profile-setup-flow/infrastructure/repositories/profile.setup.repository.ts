import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IProfileSetupRepository } from '../../domain/interface/profile.setup.interface';
import { SetupProfileDto } from '../../presentation/dto/profile-setup-flow.dto';
import { OperationHourDto } from '../../presentation/dto/profile-setup-flow.dto';

@Injectable()
export class ProfileSetupRepository implements IProfileSetupRepository {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfileAndSyncRelations(
    userId: string,
    data: SetupProfileDto,
    imageUrl?: string,
  ): Promise<void> {
    const { socialLinks, cuisines, ...profileData } = data;

    await this.prisma.$transaction(async (tx) => {
      
      let vendor = await tx.vendor.findUnique({
        where: { ownerId: userId },
        select: { id: true },
      });

      if (!vendor) {
        vendor = await tx.vendor.create({
          data: {
            ownerId: userId,
          },
          select: { id: true },
        });
      }

      const vendorId = vendor.id;

      await tx.vendor.update({
        where: { id: vendorId },
        data: {
          ...profileData,
          ...(imageUrl && { coverImage: imageUrl }),
          onboardingStep: 2,
        },
      });

      if (socialLinks !== undefined) {
        await tx.socialLink.deleteMany({
          where: { vendorId },
        });

        if (socialLinks.length > 0) {
          await tx.socialLink.createMany({
            data: socialLinks.map((link) => ({
              vendorId,
              url: link.url,
            })),
          });
        }
      }

      if (cuisines !== undefined) {
        await tx.vendorCuisine.deleteMany({
          where: { vendorId },
        });

        if (cuisines.length > 0) {
          for (const name of cuisines) {
            await tx.vendorCuisine.create({
              data: {
                vendor: {
                  connect: { id: vendorId },
                },
                cuisine: {
                  connectOrCreate: {
                    where: { name },
                    create: { name },
                  },
                },
              },
            });
          }
        }
      }
    });
  }
  
  async upsertOperationHours(
    userId: string,
    hours: OperationHourDto[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {

      let vendor = await tx.vendor.findUnique({
        where: { ownerId: userId },
        select: { id: true },
      });

      if (!vendor) {
        throw new Error('Vendor not found for this user');
      }

      const vendorId = vendor.id;

      await tx.operationHour.deleteMany({
        where: { vendorId },
      });

      if (hours.length > 0) {
        await tx.operationHour.createMany({
          data: hours.map((h) => ({
            vendorId,
            dayOfWeek: h.dayOfWeek,
            openTime: h.openTime ?? null,
            closeTime: h.closeTime ?? null,
            isClosed: h.isClosed,
          })),
        });
      }

      await tx.vendor.update({
        where: { id: vendorId },
        data: {
          onboardingStep: 3,
        },
      });
    });
  }

  
}
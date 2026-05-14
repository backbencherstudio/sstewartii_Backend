import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { 
  IProfileSetupRepository,
  VendorProfileSetupView,
} from '../../domain/interface/profile.setup.interface';

import { 
  SetupProfileDto,
  OperationHourDto,
  ServiceAreaDto,
  UpdateServiceAreaDto,
 } from '../../presentation/dto/profile-setup-flow.dto';

@Injectable()
export class ProfileSetupRepository implements IProfileSetupRepository {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfileAndSyncRelations(
    userId: string,
    data: SetupProfileDto,
    imageUrl?: string,
  ): Promise<VendorProfileSetupView> {
    const { socialLinks, cuisines, ...profileData } = data;

    return this.prisma.$transaction(async (tx) => {
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

        for (const cuisineInput of cuisines) {
          const cuisineName = cuisineInput.name.trim();

          if (!cuisineName) {
            continue;
          }

          if (cuisineInput.id) {
            await tx.vendorCuisine.create({
              data: {
                vendorId,
                cuisineId: cuisineInput.id,
              },
            });

            if (cuisineInput.imageUrl) {
              await tx.cuisine.update({
                where: { id: cuisineInput.id },
                data: {
                  imageUrl: cuisineInput.imageUrl,
                },
              });
            }

            continue;
          }

          await tx.vendorCuisine.create({
            data: {
              vendor: {
                connect: { id: vendorId },
              },
              cuisine: {
                connectOrCreate: {
                  where: {
                    name: cuisineName,
                  },
                  create: {
                    name: cuisineName,
                    imageUrl: cuisineInput.imageUrl,
                  },
                },
              },
            },
          });
          
          if (cuisineInput.imageUrl) {
            await tx.cuisine.updateMany({
              where: {
                name: cuisineName,
                imageUrl: null,
              },
              data: {
                imageUrl: cuisineInput.imageUrl,
              },
            });
          }
        }
      }

      const updatedVendor = await tx.vendor.findUniqueOrThrow({
        where: { id: vendorId },
        select: {
          id: true,
          businessName: true,
          publicEmail: true,
          contactNumber: true,
          bio: true,
          coverImage: true,
          onboardingStep: true,

          cuisines: {
            include: {
              cuisine: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                },
              },
            },
          },

          socialLinks: {
            select: {
              id: true,
              url: true,
            },
          },
        },
      });

      return updatedVendor;
    });
  }
  
  async createOperationHourVersion(
    userId: string,
    hours: OperationHourDto[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {

      const vendor = await tx.vendor.findUnique({
        where: { ownerId: userId },
        select: { id: true },
      });

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      const vendorId = vendor.id;

      const now = new Date();

      const data = hours.map((h) => ({
        vendorId,
        dayOfWeek: h.dayOfWeek,
        openTime: h.isClosed ? null : h.openTime ?? null,
        closeTime: h.isClosed ? null : h.closeTime ?? null,
        isClosed: h.isClosed,
        activeFrom: h.activeFrom ? new Date(h.activeFrom) : now,
        activeTo: h.activeTo ? new Date(h.activeTo) : null,
        priority: h.priority ?? 0,
      }));

      await tx.operationHour.createMany({
        data,
      });

      await tx.vendor.update({
        where: { id: vendorId },
        data: {
          onboardingStep: 3,
        },
      });
    });
  }

  async upsertServiceArea(
    userId: string,
    data: ServiceAreaDto
  ): Promise<void> {

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

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      const vendorId = vendor.id;

      await tx.serviceArea.upsert({
        where: { vendorId },
        update: {
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address,
          radius: data.radius,
        },
        create: {
          vendorId,
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address,
          radius: data.radius,
        },
      });

      await tx.vendor.update({
        where: { id: vendorId },
        data: {
          onboardingStep: 4,
        },
      });
    });
  }

  async updateServiceArea(
    vendorId: string,
    data: UpdateServiceAreaDto,
  ): Promise<void> {

    const existing = await this.prisma.serviceArea.findUnique({
      where: { vendorId },
    });

    if (!existing) {
      throw new NotFoundException('Service area not found');
    }

   
    const updateData: any = {};
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.address !== undefined) updateData.address = data.address;

    await this.prisma.serviceArea.update({
      where: { vendorId },
      data: updateData,
    });
  }


  
}
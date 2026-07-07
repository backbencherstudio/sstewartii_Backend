import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

import {
  IProfileSetupRepository,
  VendorProfileSetupView,
  CuisineView,
} from '../../domain/interface/profile.setup.interface';

import {
  OperationHourDto,
  ServiceAreaDto,
  UpdateServiceAreaDto,
  SetupProfileDto,
} from '../../presentation/dto/profile-setup-flow.dto';

@Injectable()
export class ProfileSetupRepository implements IProfileSetupRepository {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfileAndSyncRelations(
    userId: string,
    data: SetupProfileDto,
    imageUrl?: string,
  ): Promise<VendorProfileSetupView> {
    const { socialLinks, cuisineIds, ...profileData } = data;

    return this.prisma.$transaction(async (tx) => {
      let vendor = await tx.vendor.findUnique({
        where: {
          ownerId: userId,
        },
        select: {
          id: true,
        },
      });

      if (!vendor) {
        vendor = await tx.vendor.create({
          data: {
            ownerId: userId,
            vendorCode: await this.generateUniqueVendorCode(tx),
          },
          select: {
            id: true,
          },
        });
      }

      const vendorId = vendor.id;

      await tx.vendor.update({
        where: {
          id: vendorId,
        },
        data: {
          businessName: profileData.businessName,
          publicEmail: profileData.publicEmail,
          contactNumber: profileData.contactNumber,
          bio: profileData.bio,
          ...(imageUrl && {
            coverImage: imageUrl,
          }),
          onboardingStep: 2,
        },
      });

      if (socialLinks !== undefined) {
        await tx.socialLink.deleteMany({
          where: {
            vendorId,
          },
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

      if (cuisineIds !== undefined) {
        const uniqueCuisineIds = [...new Set(cuisineIds)];

        const existingCuisines = await tx.cuisine.findMany({
          where: {
            id: {
              in: uniqueCuisineIds,
            },
          },
          select: {
            id: true,
          },
        });

        if (existingCuisines.length !== uniqueCuisineIds.length) {
          const existingIds = new Set(
            existingCuisines.map((cuisine) => cuisine.id),
          );

          const invalidIds = uniqueCuisineIds.filter(
            (id) => !existingIds.has(id),
          );

          throw new BadRequestException(
            `Invalid cuisine id: ${invalidIds.join(', ')}`,
          );
        }

        await tx.vendorCuisine.deleteMany({
          where: {
            vendorId,
          },
        });

        if (uniqueCuisineIds.length > 0) {
          await tx.vendorCuisine.createMany({
            data: uniqueCuisineIds.map((cuisineId) => ({
              vendorId,
              cuisineId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.vendor.findUniqueOrThrow({
        where: {
          id: vendorId,
        },
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
        openTime: h.isClosed ? null : (h.openTime ?? null),
        closeTime: h.isClosed ? null : (h.closeTime ?? null),
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

  async upsertServiceArea(userId: string, data: ServiceAreaDto): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      let vendor = await tx.vendor.findUnique({
        where: { ownerId: userId },
        select: { id: true },
      });

      if (!vendor) {
        vendor = await tx.vendor.create({
          data: {
            ownerId: userId,
            vendorCode: await this.generateUniqueVendorCode(tx),
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

  async findByName(name: string): Promise<CuisineView | null> {
    return this.prisma.cuisine.findUnique({
      where: {
        name,
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async createCuisine(data: {
    name: string;
    imageUrl?: string;
  }): Promise<CuisineView> {
    return this.prisma.cuisine.create({
      data: {
        name: data.name,
        imageUrl: data.imageUrl,
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAllCuisine(): Promise<CuisineView[]> {
    return this.prisma.cuisine.findMany({
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  private async generateUniqueVendorCode(tx: any): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const randomNumber = Math.floor(100000 + Math.random() * 900000);
      const vendorCode = `#${randomNumber}`;

      const existing = await tx.vendor.findUnique({
        where: {
          vendorCode,
        },
        select: {
          id: true,
        },
      });

      if (!existing) {
        return vendorCode;
      }
    }

    throw new Error('Failed to generate unique vendor code');
  }
}

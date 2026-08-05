// src/modules/vendor/profile-setup-flow/application/profile.setup.service.ts

import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { IProfileSetupRepository } from '../domain/interface/profile.setup.interface';
import type { IVendorRepository } from '../../vendor/domain/interface/vendor.repository.interface';

import {
  ServiceAreaDto,
  UpdateServiceAreaDto,
  UpsertOperationHoursDto,
  CreateCuisineDto,
  SetupProfileDto,
  OperationHourDto,
} from '../presentation/dto/profile-setup-flow.dto';
import {
  CuisineResponseDto,
  OperationHoursResponseDto,
  VendorProfileSetupResponseDto,
} from '../presentation/dto/profile-setup-flow.response.dto';

import type { IStorageService } from 'src/common/storage/storage.interface';
import { VendorProfileSetupMapper } from '../infrastructure/mapper/vendor-profile-setup-mapper';

@Injectable()
export class ProfileSetupFlowService {
  constructor(
    @Inject('IProfileSetupRepository')
    private readonly vendorRepository: IProfileSetupRepository,

    @Inject('IStorageService')
    private readonly storageService: IStorageService,

    @Inject('IVendorRepository')
    private readonly vendorRepo: IVendorRepository,

    private readonly vendorProfileSetupMapper: VendorProfileSetupMapper,
  ) {}

  async saveProfile(
    userId: string,
    dto: SetupProfileDto,
    file?: Express.Multer.File,
  ): Promise<VendorProfileSetupResponseDto> {
    let imageUrl: string | undefined;

    if (file) {
      imageUrl = await this.storageService.uploadFile(file, 'vendor/profile');
    }

    const vendor = await this.vendorRepository.updateProfileAndSyncRelations(
      userId,
      dto,
      imageUrl,
    );

    return this.vendorProfileSetupMapper.toResponse(vendor);
  }

  async upsertOperationHours(
    userId: string,
    dto: UpsertOperationHoursDto,
  ): Promise<OperationHoursResponseDto> {
    // Validate hours
    this.validateOperationHours(dto.hours);

    // Check for duplicate days
    const days = new Set(dto.hours.map((h) => h.dayOfWeek));
    if (days.size !== dto.hours.length) {
      throw new BadRequestException(
        'Duplicate dayOfWeek entries are not allowed',
      );
    }

    const result = await this.vendorRepository.createOperationHourVersion(
      userId,
      dto,
    );

    return this.vendorProfileSetupMapper.toOperationHoursResponse(result);
  }

  async getOperationHours(userId: string): Promise<OperationHoursResponseDto> {
    // Find vendor by ownerId
    const vendor = await this.vendorRepo.findByOwnerId(userId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Get operation hours
    const result = await this.vendorRepository.findOperationHoursByVendorId(
      vendor.id,
    );

    if (!result) {
      // Return empty response if no operation hours exist
      return {
        vendorId: vendor.id,
        activePeriodStart: new Date(),
        activePeriodEnd: null,
        hours: [],
        todayStatus: {
          isOpen: false,
          openTime: null,
          closeTime: null,
          leavingSoonEnabled: false,
          leavingSoonMinutes: null,
          customLeavingTime: null,
          timeUntilClose: null,
          timeUntilLeavingSoon: null,
        },
      };
    }

    return this.vendorProfileSetupMapper.toOperationHoursResponse(result);
  }

  async upsertServiceArea(userId: string, dto: ServiceAreaDto): Promise<void> {
    if (dto.radius > 50) {
      throw new BadRequestException('Radius too large (max 50km allowed)');
    }

    return this.vendorRepository.upsertServiceArea(userId, dto);
  }

  async updateServiceArea(
    userId: string,
    dto: UpdateServiceAreaDto,
  ): Promise<void> {
    const vendor = await this.vendorRepo.findByOwnerId(userId);

    if (!vendor) {
      throw new BadRequestException('Vendor profile not found');
    }

    if (!dto.latitude && !dto.longitude && !dto.address) {
      throw new BadRequestException('At least one field must be provided');
    }

    return this.vendorRepository.updateServiceArea(vendor.id, dto);
  }

  async createCuisine(
    dto: CreateCuisineDto,
    file?: Express.Multer.File,
  ): Promise<CuisineResponseDto> {
    const name = dto.name.trim();

    if (!name) {
      throw new BadRequestException('Cuisine name is required');
    }

    const existing = await this.vendorRepository.findByName(name);

    if (existing) {
      throw new ConflictException('Cuisine already exists');
    }

    let imageUrl: string | undefined;

    if (file) {
      imageUrl = await this.storageService.uploadFile(file, 'cuisines');
    }

    const cuisine = await this.vendorRepository.createCuisine({
      name,
      imageUrl,
    });

    return this.vendorProfileSetupMapper.toCuisineResponse(cuisine);
  }

  async getCuisines(): Promise<CuisineResponseDto[]> {
    const cuisines = await this.vendorRepository.findAllCuisine();

    return this.vendorProfileSetupMapper.toListResponse(cuisines);
  }

  private validateOperationHours(hours: OperationHourDto[]): void {
    for (const h of hours) {
      // Check day range
      if (h.dayOfWeek < 0 || h.dayOfWeek > 6) {
        throw new BadRequestException(
          `dayOfWeek must be between 0 and 6, got ${h.dayOfWeek}`,
        );
      }

      // Validate open/close times when not closed
      if (!h.isClosed) {
        if (!h.openTime || !h.closeTime) {
          throw new BadRequestException(
            `Open and close time required when not closed for day ${h.dayOfWeek}`,
          );
        }

        // Validate time format
        const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(h.openTime)) {
          throw new BadRequestException(
            `Invalid openTime format for day ${h.dayOfWeek}. Expected HH:MM`,
          );
        }
        if (!timeRegex.test(h.closeTime)) {
          throw new BadRequestException(
            `Invalid closeTime format for day ${h.dayOfWeek}. Expected HH:MM`,
          );
        }

        // Validate openTime < closeTime
        const openMinutes = this.parseTimeToMinutes(h.openTime);
        const closeMinutes = this.parseTimeToMinutes(h.closeTime);
        if (openMinutes >= closeMinutes) {
          throw new BadRequestException(
            `Close time must be after open time for day ${h.dayOfWeek}`,
          );
        }
      }

      // Validate leaving soon minutes
      if (h.leavingSoonEnabled && h.leavingSoonMinutes !== undefined) {
        if (h.leavingSoonMinutes < 1 || h.leavingSoonMinutes > 120) {
          throw new BadRequestException(
            `Leaving soon minutes must be between 1 and 120 for day ${h.dayOfWeek}`,
          );
        }
      }

      // Validate custom leaving time format if provided
      if (h.customLeavingTime) {
        const timeRegex = /^([0-9]{2}):([0-5][0-9]):([0-5][0-9])$/;
        if (!timeRegex.test(h.customLeavingTime)) {
          throw new BadRequestException(
            `Invalid customLeavingTime format for day ${h.dayOfWeek}. Expected HH:MM:SS`,
          );
        }
      }

      // Validate activeFrom/activeTo
      if (h.activeFrom && h.activeTo) {
        const from = new Date(h.activeFrom);
        const to = new Date(h.activeTo);
        if (from >= to) {
          throw new BadRequestException(
            `activeFrom must be before activeTo for day ${h.dayOfWeek}`,
          );
        }
      }
    }
  }

  private parseTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}

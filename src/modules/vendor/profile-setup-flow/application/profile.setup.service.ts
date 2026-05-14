import { 
  Injectable, 
  Inject, 
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import type { IProfileSetupRepository } from '../domain/interface/profile.setup.interface';
import type { IVendorRepository } from '../../vendor/domain/interface/vendor.repository.interface';

import { 
  ServiceAreaDto,
  UpdateServiceAreaDto,
  UpsertOperationHoursDto,
  CreateCuisineDto,
  SetupProfileDto,
 } from '../presentation/dto/profile-setup-flow.dto';
import { 
  CuisineResponseDto,
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
      imageUrl = await this.storageService.uploadFile(
        file,
        'vendor/profile',
      );
    }

    const vendor =
      await this.vendorRepository.updateProfileAndSyncRelations(
        userId,
        dto,
        imageUrl,
      );

    return this.vendorProfileSetupMapper.toResponse(vendor);
  }

  async upsertOperationHours(
    userId: string,
    dto: UpsertOperationHoursDto,
  ): Promise<void> {

    for (const h of dto.hours) {
      if (!h.isClosed && (!h.openTime || !h.closeTime)) {
        throw new Error('Open and close time required when not closed');
      }
    }

    return this.vendorRepository.createOperationHourVersion(
        userId,
        dto.hours,
      );
    }

  async upsertServiceArea(
    userId: string,
    dto: ServiceAreaDto,
  ): Promise<void> {

    if (dto.radius > 50) {
      throw new Error('Radius too large (max 50km allowed)');
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
      imageUrl = await this.storageService.uploadFile(
        file,
        'cuisines',
      );
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

}
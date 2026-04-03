import { Injectable, Inject } from '@nestjs/common';
import type { IProfileSetupRepository } from '../domain/interface/profile.setup.interface';
import { SetupProfileDto } from '../presentation/dto/profile-setup-flow.dto';
import type { IStorageService } from 'src/common/storage/storage.interface';
import { UpsertOperationHoursDto } from '../presentation/dto/profile-setup-flow.dto';
import { ServiceAreaDto } from '../presentation/dto/profile-setup-flow.dto';

@Injectable()
export class ProfileSetupFlowService {

  constructor(
    @Inject('IProfileSetupRepository')
    private readonly vendorRepository: IProfileSetupRepository,
    @Inject('IStorageService')
    private readonly storageService: IStorageService,
  ) {}

  async saveProfile(vendorId: string, dto: SetupProfileDto, file?: Express.Multer.File): Promise<void> {
    
    let imageUrl: string | undefined;

    if (file) {
      imageUrl = await this.storageService.uploadFile(file, 'vendor/profile');
    }

    return this.vendorRepository.updateProfileAndSyncRelations(vendorId, dto, imageUrl);
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

}
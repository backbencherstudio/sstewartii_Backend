import { Injectable, Inject } from '@nestjs/common';
import type { IProfileSetupRepository } from '../domain/interface/profile.setup.interface';
import { SetupProfileDto } from '../presentation/dto/profile-setup-flow.dto';
import type { IStorageService } from 'src/common/storage/storage.interface';
import { OperationHourDto } from '../presentation/dto/profile-setup-flow.dto';

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

  async saveOperationHours(userId: string, hours: OperationHourDto[],): Promise<void> {

   return this.vendorRepository.upsertOperationHours(userId, hours);
  }
}
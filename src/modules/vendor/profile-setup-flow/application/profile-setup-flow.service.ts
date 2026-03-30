import { Injectable, Inject } from '@nestjs/common';
import type { IVendorRepository } from '../domain/interface/profile-setup-flow.interface';
import { SetupProfileDto } from '../presentation/dto/profile-setup-flow.dto';
// Assume you have a common storage service for S3/Cloudinary
import { StorageService } from 'src/common/storage/storage.service'; 

@Injectable()
export class ProfileSetupFlowService {
  constructor(
    @Inject('IVendorRepository')
    private readonly vendorRepository: IVendorRepository,
    private readonly storageService: StorageService,
  ) {}

  async saveProfile(
    vendorId: string,
    dto: SetupProfileDto,
    file?: Express.Multer.File,
  ): Promise<void> {
    let imageUrl: string | undefined;

    if (file) {
      imageUrl = await this.storageService.uploadFile(file, 'vendor/covers');
    }

    return this.vendorRepository.updateProfileAndSyncRelations(vendorId, dto, imageUrl);
  }
}
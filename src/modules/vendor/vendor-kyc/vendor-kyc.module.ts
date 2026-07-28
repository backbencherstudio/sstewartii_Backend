import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  VendorKycController,
  AdminVendorKycController,
} from './vendor-kyc.controller';
import { VendorKycService } from './vendor-kyc.service';
import { StorageModule } from '@/common/storage/storage.module';
import { PrismaModule } from '@/prisma/prisma.module'; // ← Add this import

@Module({
  imports: [
    PrismaModule, // ← Add this
    StorageModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          return callback(
            new Error('Only JPEG, PNG or WEBP images are allowed'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  ],
  controllers: [VendorKycController, AdminVendorKycController],
  providers: [VendorKycService],
  exports: [VendorKycService],
})
export class VendorKycModule {}


// import { Module } from '@nestjs/common';

// import { AdminVendorVerificationController } from './presentation/admin-vendor-verification.controller';
// import { AdminVendorVerificationService } from './application/admin-vendor-verification.service';
// import { AdminVendorVerificationRepository } from './infrastructure/repositories/admin-vendor-verification.repository';
// import { AdminVendorVerificationMapper } from './infrastructure/mapper/admin-vendor-verification.mapper';

// @Module({
//   controllers: [
//     AdminVendorVerificationController,
//   ],
//   providers: [
//     AdminVendorVerificationService,
//     AdminVendorVerificationMapper,
//     {
//       provide: 'IAdminVendorVerificationRepository',
//       useClass: AdminVendorVerificationRepository,
//     },
//   ],
//   exports: [
//     AdminVendorVerificationService,
//   ],
// })
// export class AdminModule {}
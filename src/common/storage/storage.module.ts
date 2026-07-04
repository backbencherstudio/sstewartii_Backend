import { Global, Module } from '@nestjs/common';
import { LocalStorageService } from './local.storage.service';

@Global()
@Module({
  providers: [
    LocalStorageService,
    {
      provide: 'IStorageService',
      useClass: LocalStorageService,
    },
  ],
  exports: ['IStorageService', LocalStorageService],
})
export class StorageModule {}

import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import type { IVendorRepository } from '../domain/interface/vendor.repository.interface';

@Injectable()
export class VendorService {

  constructor(
    @Inject('IVendorRepository') 
    private readonly vendorRepository: IVendorRepository
  ) {}

  async execute(ownerId: string) {
    const vendor = await this.vendorRepository.findByOwnerId(ownerId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return vendor;
  }
}
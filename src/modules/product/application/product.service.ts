import {
  Injectable,
  Inject,
  BadRequestException,
} from '@nestjs/common';

import type { ICuisineRepository } from '../domain/interfaces/cuisine.interface';
import type { IVendorRepository } from '@/modules/vendor/vendor/domain/interface/vendor.repository.interface';
import { Cuisine } from '../domain/entities/cuisine.entity';

@Injectable()
export class ProductService {
  constructor(
    @Inject('ICuisineRepository')
    private readonly cuisineRepo: ICuisineRepository,

    @Inject('IVendorRepository')
    private readonly vendorRepo: IVendorRepository,
  ) {}

  async getVendorCuisines(userId: string): Promise<Cuisine[]> {
    const vendor = await this.vendorRepo.findByOwnerId(userId);

    if (!vendor) {
      throw new BadRequestException('Vendor not found');
    }

    return this.cuisineRepo.findByVendorId(vendor.id);
  }
}
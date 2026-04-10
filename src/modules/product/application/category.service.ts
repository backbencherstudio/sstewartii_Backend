import {
  Injectable,
  Inject,
  BadRequestException,
} from '@nestjs/common';

import { randomUUID } from 'crypto';
import { Category } from '../domain/entities/category.entity';
import type { ICategoryRepository } from '../domain/interfaces/category.interface';
import type { IVendorRepository } from '@/modules/vendor/vendor/domain/interface/vendor.repository.interface';

@Injectable()
export class CategoryService {
  constructor(
    @Inject('ICategoryRepository')
    private readonly categoryRepo: ICategoryRepository,

    @Inject('IVendorRepository')
    private readonly vendorRepo: IVendorRepository,
  ) {}

  async createCategory(
    userId: string,
    name: string,
  ): Promise<Category> {
    const vendor = await this.vendorRepo.findByOwnerId(userId);

    if (!vendor) {
      throw new BadRequestException('Vendor not found');
    }

    const existing = await this.categoryRepo.findByName(
      vendor.id,
      name,
    );

    if (existing) {
      throw new BadRequestException('Category already exists');
    }

    const category = new Category(
      randomUUID(),
      name,
      vendor.id,
      new Date(),
      new Date(),
    );

    return this.categoryRepo.create(category);
  }

  async getCategories(userId: string): Promise<Category[]> {
    const vendor = await this.vendorRepo.findByOwnerId(userId);

    if (!vendor) {
      throw new BadRequestException('Vendor not found');
    }

    return this.categoryRepo.findByVendorId(vendor.id);
  }
}
import {
  Injectable,
  Inject,
  BadRequestException,
} from '@nestjs/common';

import type { ICuisineRepository } from '../domain/interfaces/cuisine.interface';
import type { IVendorRepository } from '@/modules/vendor/vendor/domain/interface/vendor.repository.interface';
import { Cuisine } from '../domain/entities/cuisine.entity';
import type { IProductRepository } from '../domain/interfaces/product.interface';
import type { IStorageService } from '@/common/storage/storage.interface';
import { CreateProductDto } from '../presentation/dto/product.dto';

@Injectable()
export class ProductService {
  constructor(
    @Inject('IProductRepository')
    private readonly productRepo: IProductRepository,

    @Inject('ICuisineRepository')
    private readonly cuisineRepo: ICuisineRepository,

    @Inject('IVendorRepository')
    private readonly vendorRepo: IVendorRepository,

    @Inject('IStorageService')
    private readonly storage: IStorageService,
  ) {}

  async getVendorCuisines(userId: string): Promise<Cuisine[]> {
    const vendor = await this.vendorRepo.findByOwnerId(userId);

    if (!vendor) {
      throw new BadRequestException('Vendor not found');
    }

    return this.cuisineRepo.findByVendorId(vendor.id);
  }

  async createProduct(
    userId: string,
    dto: CreateProductDto,
    files: Express.Multer.File[],
  ) {
    const vendor = await this.vendorRepo.findByOwnerId(userId);

    if (!vendor) {
      throw new BadRequestException('Vendor not found');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image required');
    }

    const folder = `vendor/product/productImages`;

    const imageUrls = await Promise.all(
      (files || []).map((file) =>
        this.storage.uploadFile(file, folder),
      ),
    );

    return this.productRepo.createFullProduct({
      vendorId: vendor.id,
      dto,
      images: imageUrls,
    });
  }
  
}
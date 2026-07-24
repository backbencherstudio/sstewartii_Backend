import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import type { ICuisineRepository } from '../domain/interfaces/cuisine.interface';
import type { IVendorRepository } from '@/modules/vendor/vendor/domain/interface/vendor.repository.interface';
import { Cuisine } from '../domain/entities/cuisine.entity';
import type { IProductRepository } from '../domain/interfaces/product.interface';
import type { IStorageService } from '@/common/storage/storage.interface';
import {
  CreateProductDto,
  UpdateProductStatusDto,
} from '../presentation/dto/product.dto';
import { ProductResponseDto } from '../presentation/dto/product.response.dto';
import { ProductMapper } from '../infrastructure/mappers/product.mapper';
import { ProductCart } from '../domain/entities/product.entity';
import { MediaService } from '@/common/media/media.service';

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

    private readonly mediaService: MediaService,
    private readonly productMapper: ProductMapper,
  ) {}

  async findActiveProductForCart(
    productId: string,
  ): Promise<ProductCart | null> {
    return this.productRepo.findActiveProductForCart(productId);
  }

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
  ): Promise<ProductResponseDto> {
    const vendor = await this.vendorRepo.findByOwnerId(userId);

    if (!vendor) {
      throw new BadRequestException('Vendor not found');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image required');
    }

    if (dto.categoryId) {
      const categoryExists = await this.productRepo.existsActiveCategoryById(
        dto.categoryId,
      );

      if (!categoryExists) {
        throw new BadRequestException('Invalid category');
      }
    }

    if (dto.cuisineId) {
      const cuisineExists = await this.productRepo.existsCuisineById(
        dto.cuisineId,
      );

      if (!cuisineExists) {
        throw new BadRequestException('Invalid cuisine');
      }
    }

    const folder = 'vendor/product/productImages';

    const imageUrls = await Promise.all(
      files.map((file) => this.storage.uploadFile(file, folder)),
    );

    const product = await this.productRepo.createFullProduct({
      vendorId: vendor.id,
      dto,
      images: imageUrls,
    });

    return this.productMapper.toResponse(product);
  }

  async getVendorProducts(userId: string): Promise<ProductResponseDto[]> {
    const vendor = await this.vendorRepo.findByOwnerId(userId);

    if (!vendor) {
      throw new BadRequestException('Vendor not found');
    }

    const products = await this.productRepo.findProductByVendorId(vendor.id);

    return products.map((product) => this.productMapper.toResponse(product));
  }

  async updateProductStatus(
    userId: string,
    productId: string,
    dto: UpdateProductStatusDto,
  ): Promise<ProductResponseDto> {
    const vendor = await this.vendorRepo.findByOwnerId(userId);

    if (!vendor) {
      throw new BadRequestException('Vendor not found');
    }

    const product = await this.productRepo.findProductByIdAndVendorId(
      productId,
      vendor.id,
    );

    if (!product) {
      throw new NotFoundException(
        'Product not found or does not belong to this vendor',
      );
    }

    if (product.isActive === dto.isActive) {
      throw new BadRequestException(
        `Product is already ${dto.isActive ? 'active' : 'inactive'}`,
      );
    }

    const updated = await this.productRepo.updateProductStatus(
      productId,
      dto.isActive,
    );

    return this.productMapper.toResponse(updated);
  }

  async deleteProduct(userId: string, productId: string): Promise<void> {
    const vendor = await this.vendorRepo.findByOwnerId(userId);

    if (!vendor) {
      throw new BadRequestException('Vendor not found');
    }

    const product = await this.productRepo.findProductByIdAndVendorId(
      productId,
      vendor.id,
    );

    if (!product) {
      throw new NotFoundException(
        'Product not found or does not belong to this vendor',
      );
    }

    await this.productRepo.deleteProduct(productId);
  }

  async getProductDetail(productId: string): Promise<ProductResponseDto> {
    const product = await this.productRepo.findProductDetailById(productId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Use the mapper to convert to response DTO
    return this.productMapper.toResponse(product);
  }
}

import { VendorCategory } from './../domain/entities/vendor-category.entity';
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { IVendorCategoryRepository } from '../domain/interfaces/vendor-category.repository.interface';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../presentation/dto/vendor-category.dto';
import { VendorCategoryResponseDto } from '../presentation/dto/vendor-category.response.dto';
import { ProductBriefDto, VendorCategoryWithProductsResponseDto } from '../../vendor/presentation/dto/vendor.response.dto';

@Injectable()
export class VendorCategoryService {
  constructor(
    @Inject('IVendorCategoryRepository')
    private categoryRepository: IVendorCategoryRepository,
  ) {}

  async createCategory(
    vendorId: string,
    dto: CreateCategoryDto,
  ): Promise<VendorCategoryResponseDto> {
    // Check for duplicate name for this vendor
    const existing = await this.categoryRepository.findByName(
      vendorId,
      dto.name,
    );
    if (existing) {
      throw new ConflictException(
        `Category "${dto.name}" already exists for your vendor.`,
      );
    }

    const maxPos = await this.categoryRepository.getMaxPosition(vendorId);
    const position = maxPos + 1;

    const category = await this.categoryRepository.create({
      vendorId,
      name: dto.name,
      position,
    });

    return this.toResponseDto(category);
  }

  async getAllCategories(
    vendorId: string,
  ): Promise<VendorCategoryResponseDto[]> {
    const categories = await this.categoryRepository.findAll(vendorId);
    return categories.map((cat) => this.toResponseDto(cat));
  }

  async getCategoriesWithProducts(
    vendorId: string,
  ): Promise<VendorCategoryWithProductsResponseDto[]> {
    const categories =
      await this.categoryRepository.findAllWithProducts(vendorId);
    return categories.map((cat) => this.toCategoryWithProductsResponseDto(cat));
  }

  async getCategoryWithProducts(
    vendorId: string,
    id: string,
  ): Promise<VendorCategoryWithProductsResponseDto> {
    const category = await this.categoryRepository.findByIdWithProducts(
      vendorId,
      id,
    );
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found.`);
    }
    return this.toCategoryWithProductsResponseDto(category);
  }

  async getCategoryById(
    vendorId: string,
    id: string,
  ): Promise<VendorCategoryResponseDto> {
    const category = await this.categoryRepository.findById(vendorId, id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found.`);
    }
    return this.toResponseDto(category);
  }

  async updateCategory(
    vendorId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<VendorCategoryResponseDto> {
    const category = await this.categoryRepository.findById(vendorId, id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found.`);
    }

    // Check name uniqueness if updating name
    if (dto.name && dto.name !== category.name) {
      const existing = await this.categoryRepository.findByName(
        vendorId,
        dto.name,
      );
      if (existing) {
        throw new ConflictException(
          `Category "${dto.name}" already exists for your vendor.`,
        );
      }
    }

    const updated = await this.categoryRepository.update(vendorId, id, {
      name: dto.name,
      isActive: dto.isActive,
      position: dto.position,
    });

    return this.toResponseDto(updated);
  }

  async deleteCategory(vendorId: string, id: string): Promise<void> {
    const category = await this.categoryRepository.findById(vendorId, id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found.`);
    }

    const isEmpty = await this.categoryRepository.isCategoryEmpty(vendorId, id);
    if (!isEmpty) {
      throw new BadRequestException(
        `Cannot delete category "${category.name}" because it contains products. Remove products first.`,
      );
    }

    await this.categoryRepository.delete(vendorId, id);
  }

  private toResponseDto(category: VendorCategory): VendorCategoryResponseDto {
    return new VendorCategoryResponseDto({
      id: category.id,
      name: category.name,
      isActive: category.isActive,
      position: category.position,
      productCount: category.productCount || 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  }

  private toCategoryWithProductsResponseDto(
    category: VendorCategory,
  ): VendorCategoryWithProductsResponseDto {
    const products =
      category.products?.map(
        (p) =>
          new ProductBriefDto({
            id: p.id,
            name: p.name,
            price: p.price,
            isActive: p.isActive,
            description: p.description,
            estimateCookTime: p.estimateCookTime,
            imageUrl: p.imageUrl || undefined,
          }),
      ) || [];

    return new VendorCategoryWithProductsResponseDto({
      id: category.id,
      name: category.name,
      isActive: category.isActive,
      position: category.position,
      productCount: category.productCount || 0,
      products,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  }
}

/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import { CustomerEntity } from '../entities/customer.entity';
import {
  NearbyVendorsQueryDto,
  ExploreMapQueryDto,
  FoodFilterQueryDto,
  FavoriteProductsQueryDto,
  TopPicksQueryDto,
  FavoriteVendorsQueryDto,
  CustomerAdvancedSearchQueryDto,
} from '../../presentation/dto/customer.dto';

export interface ICustomerRepository {
  findByUserId(userId: string): Promise<CustomerEntity | null>;
  findByCustomerId(userId: string): Promise<CustomerEntity | null>;

  create(data: {
    userId: string;
    latitude: number;
    longitude: number;
    address?: string;
  }): Promise<any>;

  updateLocation(
    userId: string,
    data: {
      latitude: number;
      longitude: number;
      address?: string;
    },
  ): Promise<any>;

  findNearbyVendorCandidates(query: NearbyVendorsQueryDto): Promise<any[]>;

  findTopPickProducts(query: TopPicksQueryDto): Promise<any[]>;

  findExploreMapVendorCandidates(query: ExploreMapQueryDto): Promise<any[]>;

  findFoodCandidates(query: FoodFilterQueryDto): Promise<any[]>;

  findActiveProductById(productId: string): Promise<{ id: string } | null>;

  findFavoriteProduct(
    customerId: string,
    productId: string,
  ): Promise<{ id: string } | null>;

  createFavoriteProduct(data: {
    customerId: string;
    productId: string;
  }): Promise<void>;

  removeFavoriteProduct(favoriteId: string): Promise<void>;

  findFavoriteProducts(
    customerId: string,
    query: FavoriteProductsQueryDto,
  ): Promise<any[]>;

  findFavoriteVendor(
    customerId: string,
    vendorId: string,
  ): Promise<{ id: string } | null>;

  createFavoriteVendor(data: {
    customerId: string;
    vendorId: string;
  }): Promise<void>;

  removeFavoriteVendor(favoriteId: string): Promise<void>;

  findFavoriteVendors(
    customerId: string,
    query: FavoriteVendorsQueryDto,
  ): Promise<any[]>;

  findFoodSearchCandidates(
    query: CustomerAdvancedSearchQueryDto,
  ): Promise<any[]>;

  findTruckSearchCandidates(
    query: CustomerAdvancedSearchQueryDto,
  ): Promise<any[]>;

  findFavoriteProductIds(customerId: string): Promise<string[]>;

  findFavoriteVendorIds(customerId: string): Promise<string[]>;

  findFavoriteVendorIdsByCustomerId(customerId: string): Promise<string[]>;

  findAllFavoriteProductIds(customerId: string): Promise<string[]>;

  /**
   * Get all favorite vendor IDs for a customer
   */
  findAllFavoriteVendorIds(customerId: string): Promise<string[]>;

  updateProfile(
    userId: string,
    data: {
      name?: string;
      phoneNumber?: string;
      dateOfBirth?: Date;
      address?: string;
      preferredRadius?: number;
      avatar?: string;
    },
  ): Promise<CustomerEntity>;

  /**
   * Get order history for a customer with filtering and pagination
   */
  findOrderHistory(
    customerId: string,
    filter: 'all' | 'completed' | 'cancelled',
    page: number,
    limit: number,
  ): Promise<{
    items: any[];
    total: number;
  }>;

  /**
   * Get detailed order information by order ID
   */
  findOrderDetail(orderId: string): Promise<any | null>;
}

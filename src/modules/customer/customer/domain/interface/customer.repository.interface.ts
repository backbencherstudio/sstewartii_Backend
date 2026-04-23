import { CustomerEntity } from "../entities/customer.entity";
import { 
  NearbyVendorsQueryDto,
  ExploreMapQueryDto,
  FoodFilterQueryDto,
  FavoriteProductsQueryDto,
  TopPicksQueryDto,
 } from "../../presentation/dto/customer.dto";

export interface ICustomerRepository {
  
  findByUserId(userId: string): Promise<CustomerEntity | null>;

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

  findNearbyVendorCandidates(
    query: NearbyVendorsQueryDto,
  ): Promise<any[]>;

  findTopPickProducts(
    query: TopPicksQueryDto,
  ): Promise<any[]>;

  findExploreMapVendorCandidates(
    query: ExploreMapQueryDto,
  ): Promise<any[]>;

  findFoodCandidates(
    query: FoodFilterQueryDto,
  ): Promise<any[]>;

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
}
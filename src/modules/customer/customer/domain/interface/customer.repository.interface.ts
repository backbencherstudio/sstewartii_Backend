import { CustomerEntity } from "../entities/customer.entity";
import { 
  NearbyVendorsQueryDto,
  ExploreMapQueryDto,
 } from "../../presentation/dto/customer.dto";
 
import { TopPicksQueryDto } from "../../presentation/dto/customer.dto";

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
}
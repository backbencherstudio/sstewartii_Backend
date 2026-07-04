import { Cuisine } from '../entities/cuisine.entity';

export interface ICuisineRepository {
  findByVendorId(vendorId: string): Promise<Cuisine[]>;
}

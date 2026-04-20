import { Vendor } from "../entities/vendor.entity";
import { VendorMenuQueryDto } from '../../presentation/dto/vendor.dto';

export interface IVendorRepository {

  findByOwnerId(ownerId: string): Promise<Vendor | null>;

  findById(id: string): Promise<Vendor | null>;
  
  findVendorMenuById(
    vendorId: string,
    query: VendorMenuQueryDto,
  ): Promise<any | null>;
}
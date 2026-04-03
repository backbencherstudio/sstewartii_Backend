import { Vendor } from "../entities/vendor.entity";

export interface IVendorRepository {

  findByOwnerId(ownerId: string): Promise<Vendor | null>;

  findById(id: string): Promise<Vendor | null>;
}
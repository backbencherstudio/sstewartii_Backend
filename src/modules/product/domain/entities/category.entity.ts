export class Category {
  constructor(
    public id: string,
    public name: string,
    public vendorId: string,
    public createdAt?: Date,
    public updatedAt?: Date,
  ) {}
}
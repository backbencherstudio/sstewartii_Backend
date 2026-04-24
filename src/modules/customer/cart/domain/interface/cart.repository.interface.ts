export interface CartOwnerView {
  id: string;
  customerId: string;
  vendorId: string;
}

export interface CreateCartItemInput {
  cartId: string;
  productId: string;
  quantity: number;
  price: number;
  sizeOptionId?: string;
  note?: string;
  choiceOptionIds?: string[];
  addOnIds?: string[];
}

export interface ICartRepository {
  findOrCreateCart(data: {
    customerId: string;
    vendorId: string;
  }): Promise<CartOwnerView>;

  findCartById(cartId: string): Promise<any | null>;

  createCartItem(input: CreateCartItemInput): Promise<void>;

  recalculateCartTotal(cartId: string): Promise<void>;
}
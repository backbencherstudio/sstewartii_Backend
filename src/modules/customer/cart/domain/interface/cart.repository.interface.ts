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

  createCartItems(inputs: CreateCartItemInput[]): Promise<void>;

  recalculateCartTotal(cartId: string): Promise<void>;

  findCartListByCustomerId(customerId: string): Promise<any[]>;

  findCartOwner(
    cartId: string,
  ): Promise<{ id: string; customerId: string } | null>;

  deleteCart(cartId: string): Promise<void>;

  findCartItemOwner(itemId: string): Promise<{
    id: string;
    cartId: string;
    quantity: number;
    cart: {
      customerId: string;
    };
  } | null>;

  updateCartItemQuantity(itemId: string, quantity: number): Promise<void>;

  deleteCartItem(itemId: string): Promise<void>;

  deleteCartIfEmpty(cartId: string): Promise<void>;

  findCartByCustomerId(customerId: string): Promise<any[]>;
}

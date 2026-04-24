import { 
  CartResponseDto,
  CartListResponseDto,
} from '../../presentation/dto/cart.response.dto';

export class CartMapper {
  static toResponse(cart: any): CartResponseDto {
    return {
      id: cart.id,
      customerId: cart.customerId,
      vendorId: cart.vendorId,
      vendorName: cart.vendor?.businessName ?? 'Unnamed Vendor',
      totalAmount: cart.totalAmount,
      itemCount: cart.items.reduce(
        (acc: number, item: any) => acc + item.quantity,
        0,
      ),
      updatedAt: cart.updatedAt,
      items: cart.items.map((item: any) => {
        const sizePrice = item.sizeOption?.price ?? 0;

        const addOnTotal = item.addOns.reduce(
          (acc: number, entry: any) => acc + entry.addOn.price,
          0,
        );

        const lineTotal =
          (item.price + sizePrice + addOnTotal) * item.quantity;

        return {
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          productImage: item.product.images?.[0]?.url,
          vendorId: item.product.vendorId,
          vendorName: item.product.vendor?.businessName ?? 'Unnamed Vendor',
          quantity: item.quantity,
          unitBasePrice: item.price,
          sizePrice,
          addOnTotal,
          lineTotal,
          note: item.note ?? undefined,
          sizeOption: item.sizeOption
            ? {
                id: item.sizeOption.id,
                name: item.sizeOption.name,
                price: item.sizeOption.price,
              }
            : undefined,
          choiceOptions: item.choiceOptions.map((entry: any) => ({
            id: entry.choiceOption.id,
            name: entry.choiceOption.name,
            price: entry.choiceOption.price,
          })),
          addOns: item.addOns.map((entry: any) => ({
            id: entry.addOn.id,
            name: entry.addOn.name,
            price: entry.addOn.price,
          })),
        };
      }),
    };
  }
    static toCartListResponse(carts: any[]): CartListResponseDto {
    return {
      carts: carts.map((cart) => ({
        cartId: cart.id,
        vendor: {
          id: cart.vendor.id,
          businessName: cart.vendor.businessName ?? 'Unnamed Vendor',
          coverImage:
            cart.vendor.coverImage ??
            cart.vendor.truckGalleryImages?.[0]?.url ??
            undefined,
          address: cart.vendor.serviceArea?.address ?? undefined,
        },
        items: cart.items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          productImage: item.product.images?.[0]?.url ?? undefined,
          quantity: item.quantity,
        })),
        totalAmount: cart.totalAmount,
        itemCount: cart.items.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0,
        ),
        updatedAt: cart.updatedAt,
      })),
    };
  }

}
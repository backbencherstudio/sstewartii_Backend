
export class CustomerOrderHistoryDto {
  orderId!: string;
  orderNumber!: string;
  vendorName!: string;
  vendorEmail!: string;
  date!: string;
  time!: string;
  totalAmount!: number;
  status!: string;
}

export class CustomerDetailResponseDto {
  id!: string;
  userId!: string;
  fullName!: string;
  email!: string;
  avatar!: string | null;
  dateOfBirth!: Date | null;
  cityOfResidence!: string | null;
  phoneNumber!: string | null;
  joinedAt!: Date;
  totalOrders!: number;
  totalSpent!: number;
  completedOrders!: number;
  cancelledOrders!: number;
  incompleteOrders!: number;
  reportsFiled!: number;
  lastOrderedAt!: Date | null;
  orders!: CustomerOrderHistoryDto[];
  orderTotal!: number;
  orderPage!: number;
  orderLimit!: number;
}
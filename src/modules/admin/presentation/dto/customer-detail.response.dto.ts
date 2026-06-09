
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

export class CustomerReportQueueItemDto {
  customerId!:  string;
  customerCode!: string;
  fullName!:    string;
  email!:       string;
  avatar!:      string | null;
  reportCount!: number;
  vendorCount!: number;
}

export class CustomerReportQueueResponseDto {
  data!:  CustomerReportQueueItemDto[];
  total!: number;
  page!:  number;
  limit!: number;
}

export class ReportingVendorDto {
  vendorId!:     string;
  vendorCode!:   string;       
  businessName!: string;
  coverImage!:   string | null;
  reportCount!:  number;
}

export class CustomerReportDetailResponseDto {
  customerId!:       string;
  customerCode!:     string;
  fullName!:         string;
  avatar!:           string | null;
  completedOrders!:  number;
  cancelledOrders!:  number;
  incompleteOrders!: number;
  reportCount!:      number;
  vendorCount!:      number;
  lastOrderedAt!:    Date | null;
  vendors!:          ReportingVendorDto[];
} 

export class ReportItemDto {
  reportId!:    string;
  reportNumber!: string;   
  createdAt!:   Date;
  displayDate!: string;     
}

export class VendorReportGroupDto {
  vendorId!:     string;
  vendorCode!:   string;     
  businessName!: string;
  coverImage!:   string | null;
  reportCount!:  number;
  reports!:      ReportItemDto[];
}

export class CustomerVendorReportsResponseDto {
  vendors!: VendorReportGroupDto[];
}
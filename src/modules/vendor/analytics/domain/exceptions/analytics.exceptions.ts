export class VendorNotFoundException extends Error {
  constructor(vendorId: string) {
    super(`Vendor with id ${vendorId} was not found`);
    this.name = 'VendorNotFoundException';
  }
}

export class InvalidMonthFormatException extends Error {
  constructor(month: string) {
    super(`Month must be in YYYY-MM format, received: ${month}`);
    this.name = 'InvalidMonthFormatException';
  }
}

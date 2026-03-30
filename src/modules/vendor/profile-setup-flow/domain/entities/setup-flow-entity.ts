export class Vendor {
  constructor(
    public readonly id: string,
    public readonly businessName?: string,
    public readonly publicEmail?: string,
    public readonly contactNumber?: string,
    public readonly bio?: string,
    public readonly coverImage?: string,
    public readonly onboardingStep?: number,
    public readonly socialLinks?: { platform: string; url: string }[],
    public readonly cuisines?: string[],
  ) {}
}
export interface VendorProps {
  id: string;
  ownerId: string;

  businessName?: string;
  publicEmail?: string;
  contactNumber?: string;
  bio?: string;

  coverImage?: string;

  onboardingStep?: number;

  subscriptionExpiry?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export class Vendor {
  public id: string;
  public ownerId: string;

  public businessName?: string;
  public publicEmail?: string;
  public contactNumber?: string;
  public bio?: string;

  public coverImage?: string;

  public onboardingStep: number;

  public subscriptionExpiry?: Date | null;

  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(props: VendorProps) {
    this.id = props.id;
    this.ownerId = props.ownerId;

    this.businessName = props.businessName;
    this.publicEmail = props.publicEmail;
    this.contactNumber = props.contactNumber;
    this.bio = props.bio;

    this.coverImage = props.coverImage;

    this.onboardingStep = props.onboardingStep ?? 1;

    this.subscriptionExpiry = props.subscriptionExpiry ?? null;

    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
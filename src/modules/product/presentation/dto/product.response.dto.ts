export class ProductResponseDto {
  id!: string;
  name!: string;
  description!: string;
  price!: number;
  estimateCookTime!: number;
  isActive!: boolean;

  category?: {
    id: string;
    name: string;
  };

  cuisine?: {
    id: string;
    name: string;
    imageUrl?: string;
  };

  images!: {
    id: string;
    url?: string;
    isPrimary: boolean;
    position: number;
  }[];

  sizeOptions!: {
    id: string;
    name: string;
    price: number;
    isRequired: boolean;
  }[];

  choiceOptions!: {
    id: string;
    name: string;
    price: number;
    isRequired: boolean;
  }[];

  addOns!: {
    id: string;
    name: string;
    price: number;
    isRequired: boolean;
  }[];
}

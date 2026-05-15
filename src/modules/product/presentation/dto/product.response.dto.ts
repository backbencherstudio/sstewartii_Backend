export class ProductResponseDto {
  id!: string;
  name!: string;
  description!: string;
  price!: number;
  isActive!: boolean;

  cuisine?: {
    id: string;
    name: string;
    imageUrl?: string;
  };

  category?: {
    id: string;
    name: string;
  };
}

export class ProductDetailResponseDto extends ProductResponseDto {
  estimateCookTime!: number;

  images!: {
    id: string;
    url?: string;
    isPrimary: boolean;
    position: number;
  }[];

  cuisines!: {
    id: string;
    name: string;
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
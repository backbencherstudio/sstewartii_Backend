export interface CategorySearchView {
  id: string;
  name: string;
}

export interface ICategoryRepository {
  searchCategories(keyword?: string): Promise<CategorySearchView[]>;
}

export type ProductCategory = 'cleansing' | 'skincare' | 'outing';
export type VerdictLevel = 'go' | 'care' | 'stop' | 'unknown';

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  attributeIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type AttributeDefinition = {
  id: string;
  category: ProductCategory;
  name: string;
  description: string;
};

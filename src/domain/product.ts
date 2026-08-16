import type { ProductRuleSelection } from '@/ruletable/types';

export type ProductCategory = 'cleansing' | 'skincare' | 'outing';
export type VerdictLevel = 'go' | 'care' | 'stop' | 'consult' | 'unknown';

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  ruleSelection?: ProductRuleSelection;
  /** v0.1 localStorage migration field. New products mirror ingredient IDs here. */
  attributeIds: string[];
  createdAt: string;
  updatedAt: string;
};

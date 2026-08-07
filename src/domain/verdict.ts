import type { ProductCategory, VerdictLevel } from './product';

export type AttributeVerdict = {
  attributeId: string;
  targetType?: string;
  label?: string;
  level: VerdictLevel;
  resumeDay?: number;
  reason: string;
};

export type ProductVerdict = {
  productId: string;
  level: VerdictLevel;
  resumeDay?: number;
  decisiveAttributeId?: string;
  decidingAxis?: 'ingredient' | 'format' | 'both' | 'consult' | 'none';
  notes?: string[];
  details: AttributeVerdict[];
  rulePackVersion: string;
};

export type CategoryVerdict = {
  category: ProductCategory;
  level: VerdictLevel;
  products: ProductVerdict[];
};

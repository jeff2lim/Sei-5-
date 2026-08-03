import type { ProductCategory, VerdictLevel } from './product';

export type AttributeVerdict = {
  attributeId: string;
  level: VerdictLevel;
  resumeDay?: number;
  reason: string;
};

export type ProductVerdict = {
  productId: string;
  level: VerdictLevel;
  resumeDay?: number;
  decisiveAttributeId?: string;
  details: AttributeVerdict[];
  rulePackVersion: string;
};

export type CategoryVerdict = {
  category: ProductCategory;
  level: VerdictLevel;
  products: ProductVerdict[];
};

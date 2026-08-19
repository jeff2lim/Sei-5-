import type { Product, ProductCategory, VerdictLevel } from './product';

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
  decidingAxis?: 'ingredient' | 'format' | 'both' | 'prep_gate' | 'consult' | 'none';
  prepText?: string;
  notes?: string[];
  details: AttributeVerdict[];
  rulePackVersion: string;
};

export type EvaluatedProduct = { product: Product; verdict: ProductVerdict };

export type ProductEvaluationState =
  | { status: 'empty' }
  | { status: 'evaluated'; items: EvaluatedProduct[] };

export type CategoryEvaluationState =
  | { status: 'empty'; category: ProductCategory }
  | {
      status: 'evaluated';
      category: ProductCategory;
      level: VerdictLevel;
      products: ProductVerdict[];
    };

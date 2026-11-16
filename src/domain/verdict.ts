import type { DayCoverage, EvaluationStatus, SymptomAdjustment } from '@/ruletable/types';
import type { ProductCategory, VerdictLevel } from './product';

export type AttributeVerdict = {
  attributeId: string;
  targetType?: string;
  label?: string;
  level: VerdictLevel;
  /** 증상 반영 전 판정. level과 다르면 증상 때문에 조정된 항목입니다. */
  baseLevel?: VerdictLevel;
  symptomAdjustment?: SymptomAdjustment | null;
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
  /** 판정이 입력을 얼마나 덮었는지. level과 별개로 확인합니다. */
  evaluationStatus: EvaluationStatus;
  unknownAttributeIds: string[];
  missingInputs: Array<'ingredients'>;
  dayCoverage: DayCoverage;
  symptomAdjustment: SymptomAdjustment | null;
  rulePackVersion: string;
};

export type CategoryVerdict = {
  category: ProductCategory;
  level: VerdictLevel;
  products: ProductVerdict[];
};

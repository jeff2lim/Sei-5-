import type { ContactActionType } from './check-in';
import type { AttributeDefinition, VerdictLevel } from './product';

export type RulePeriod = {
  fromDay: number;
  toDay: number | null;
  level: Exclude<VerdictLevel, 'unknown'>;
  resumeDay?: number;
  reason: string;
};

export type AttributeRule = {
  attributeId: string;
  periods: RulePeriod[];
};

export type ContactRule = {
  symptomId: string;
  conditions: { present: true; severity?: 'mild' | 'moderate' | 'severe' };
  action: ContactActionType;
  title: string;
  body: string;
};

export type RulePackMeta = {
  id: string;
  version: string;
  status: 'DRAFT_NOT_FOR_PATIENTS' | 'PILOT' | 'APPROVED';
  source: {
    type: 'placeholder' | 'team_protocol' | 'clinic_protocol';
    title: string;
  };
  reviewedBy?: string;
  reviewedAt?: string;
};

export type RulePack = {
  meta: RulePackMeta;
  attributes: AttributeDefinition[];
  verdictRules: AttributeRule[];
  contactRules: ContactRule[];
};

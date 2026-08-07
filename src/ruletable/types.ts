export type Verdict = 'go' | 'care' | 'stop' | 'consult';
export type DisplayVerdict = Verdict | 'unknown';
export type Sensitivity = 'low' | 'normal' | 'high';
export type SensitivityPolicy = 'restorative' | 'pigment_rail' | 'irritant';
export type PhaseName = 'recovery' | 'ramp_up';
export type RuleStatus =
  'pending' | 'extrapolated' | 'team_provisional' | 'needs_review' | 'confirmed';
export type TargetType =
  | 'ingredient_group'
  | 'cleansing_method'
  | 'sunscreen_type'
  | 'base_makeup'
  | 'product_category'
  | 'behavior_warning';
export type JudgmentMode = 'judged' | 'advisory' | 'consult_only' | 'warning_text_only';
export type Urgency = 'contact_now' | 'contact_soon' | 'monitor';

export type TimelinePhase = {
  from_d: number;
  to_d: number;
  verdict: Verdict;
  condition_text: string | null;
};

export type Timeline = {
  timeline_id: string;
  target_type: TargetType;
  target_id: string;
  sensitivity: 'normal';
  sensitivity_policy: SensitivityPolicy | null;
  phases: TimelinePhase[];
  status: RuleStatus;
  flags: string[];
  evidence: {
    grade: 'direct' | 'indirect' | 'general' | 'none';
    source_procedure: 'picotoning' | 'toning' | 'co2_fractional' | 'general';
    citations: string[];
  };
};

export type ExpandedTimeline = Omit<Timeline, 'timeline_id' | 'sensitivity' | 'phases'> & {
  timeline_id: string;
  sensitivity: Sensitivity;
  phases: TimelinePhase[];
  care_start_d: number | null;
  reopen_d_day: number | null;
  true_reopen_d: number | null;
  deferred: boolean;
};

export type RuleCell = {
  timeline_id: string;
  target_type: TargetType;
  target_id: string;
  sensitivity: Sensitivity;
  sensitivity_policy: SensitivityPolicy | null;
  d_day: number;
  phase_name: PhaseName;
  verdict: Verdict;
  condition_text: string | null;
  status: RuleStatus;
  flags: string[];
  deferred: boolean;
  true_reopen_d: number | null;
};

export type GeneratedRuleTable = {
  version: '5.0.0';
  generated_at: string;
  range: [0, 14];
  timelines: ExpandedTimeline[];
  cells: RuleCell[];
  warnings: Array<{
    id: string;
    screen: 'cleansing' | 'skincare' | 'common';
    text: string;
    from_d: number;
    to_d: number;
    judgment_mode: 'warning_text_only';
  }>;
};

export type ProductRuleSelection = {
  ingredientGroupIds: string[];
  cleansingMethodIds: string[];
  sunscreenTypeId?: string;
  baseMakeupIds: string[];
  productCategoryId?: string;
};

export type ProductRuleInput = ProductRuleSelection & {
  productId: string;
  productName: string;
};

export type ResolvedTarget = {
  targetType: TargetType;
  targetId: string;
  label: string;
  verdict: DisplayVerdict;
  conditionText: string | null;
  policy: SensitivityPolicy | null;
  judgmentMode: JudgmentMode;
  deferred: boolean;
};

export type ProductRuleResult = {
  verdict: DisplayVerdict;
  decidingAxis: 'ingredient' | 'format' | 'both' | 'consult' | 'none';
  decidingTarget: string | null;
  primaryText: string;
  secondaryText: string | null;
  notes: string[];
  details: ResolvedTarget[];
};

export type SymptomAnswerV5 = {
  id: string;
  present: boolean;
  severity?: 1 | 2 | 3;
};

export type SymptomEvaluation = {
  overallUrgency: Urgency | null;
  triggered: Array<{ id: string; urgency?: Urgency; severity?: 1 | 2 | 3; reason: string }>;
  verdictAdjustment: 'warning_lock' | 'downgraded_one_step' | null;
  notes: string[];
};

export type ValidationReport = {
  errors: string[];
  warnings: string[];
  statusCounts: Record<string, number>;
  co2FractionalEvidence: string[];
  deferred: string[];
  needsReview: string[];
};

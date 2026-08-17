export type Verdict = 'go' | 'care' | 'stop' | 'consult';
export type DisplayVerdict = Verdict | 'unknown';
export type Sensitivity = 'low' | 'normal' | 'high';
export type SensitivityPolicy = 'restorative' | 'pigment_rail' | 'irritant' | 'prep_gate';
export type PhaseName = 'prep' | 'recovery' | 'ramp_up';
export type RuleStatus =
  'extrapolated' | 'team_provisional' | 'needs_review' | 'confirmed' | 'pending_removal';
export type TargetType =
  | 'ingredient_group'
  | 'cleansing_method'
  | 'sunscreen_type'
  | 'base_makeup'
  | 'product_category'
  | 'behavior_warning';
export type JudgmentMode = 'judged' | 'advisory' | 'consult_only' | 'warning_text_only';
export type Urgency = 'contact_now' | 'contact_soon' | 'monitor';
export type EvidenceGrade = 'direct' | 'indirect' | 'general' | 'weak';
export type CombinationRelation = 'separate_days' | 'separate_time' | 'no_restriction';

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
    grade: EvidenceGrade;
    source_procedure: 'picotoning' | 'toning' | 'co2_fractional' | 'general';
    citations: string[];
  };
};

export type PrepTimelinePhase = {
  from_dtn: number;
  to_dtn: number;
  verdict: Verdict;
  condition_text: string | null;
};

export type PrepTimeline = {
  prep_timeline_id: string;
  target_type: TargetType;
  target_id: string;
  sensitivity: 'normal';
  sensitivity_policy: 'restorative' | 'prep_gate' | null;
  phases: PrepTimelinePhase[];
  status: RuleStatus;
  evidence: {
    grade: EvidenceGrade;
    citations: string[];
  };
};

export type ExpandedPrepTimeline = Omit<
  PrepTimeline,
  'prep_timeline_id' | 'sensitivity' | 'phases'
> & {
  prep_timeline_id: string;
  sensitivity: Sensitivity;
  phases: PrepTimelinePhase[];
  stop_start_dtn: number | null;
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

export type PrepRuleCell = {
  prep_timeline_id: string;
  target_type: TargetType;
  target_id: string;
  sensitivity: Sensitivity;
  sensitivity_policy: 'restorative' | 'prep_gate' | null;
  days_to_next: number;
  phase_name: 'prep';
  verdict: Verdict;
  condition_text: string | null;
  status: RuleStatus;
};

export type PrepBehaviorWarning = {
  id: string;
  screen: 'prep';
  text: string;
  from_dtn: number;
  judgment_mode: 'warning_text_only';
};

export type GeneratedRuleTable = {
  version: '6.0.0';
  generated_at: string;
  range: [-7, 14];
  timelines: ExpandedTimeline[];
  cells: RuleCell[];
  prep_timelines: ExpandedPrepTimeline[];
  prep_cells: PrepRuleCell[];
  warnings: Array<{
    id: string;
    screen: 'cleansing' | 'skincare' | 'common';
    text: string;
    from_d: number;
    to_d: number;
    judgment_mode: 'warning_text_only';
  }>;
  prep_warnings: PrepBehaviorWarning[];
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
  phaseName: PhaseName;
  daysToNext: number | null;
  prepGated: boolean;
  prepText: string | null;
};

export type ProductRuleResult = {
  verdict: DisplayVerdict;
  decidingAxis: 'ingredient' | 'format' | 'both' | 'prep_gate' | 'consult' | 'none';
  decidingTarget: string | null;
  primaryText: string;
  secondaryText: string | null;
  prepText: string | null;
  notes: string[];
  details: ResolvedTarget[];
};

export type CombinationTarget = {
  type: 'ingredient_group' | 'cleansing_method';
  id: string;
};

export type CombinationPair = {
  pair_id: string;
  a: CombinationTarget;
  b: CombinationTarget;
  relation: CombinationRelation;
  verdict_effect: 'none';
  active_from_d: null;
  slot_a: 'morning' | 'evening' | null;
  slot_b: 'morning' | 'evening' | null;
  user_text: string;
  reason_text: string;
  evidence: {
    grade: EvidenceGrade;
    source_procedure: null;
    citations: string[];
  };
  status: RuleStatus;
};

export type GeneratedCombination = Omit<CombinationPair, 'active_from_d'> & {
  sensitivity: Sensitivity;
  active_from_d: number;
};

export type CombinationProduct = {
  productId: string;
  ingredientGroupIds: string[];
  cleansingMethodIds: string[];
};

export type CombinationGuideCategory = 'cleansing' | 'skincare' | 'outing';

export type CombinationUiProduct = CombinationProduct & {
  name: string;
  category: CombinationGuideCategory;
  verdict: DisplayVerdict;
};

export type CombinationDisplayProduct = {
  productId: string;
  name: string;
  category: CombinationGuideCategory;
};

export type CombinationDisplayPair = {
  pairId: string;
  relation: CombinationRelation;
  ingredientLabels: [string, string];
  products: CombinationDisplayProduct[];
  userText: string;
  reasonText: string;
  activeFromD: number;
  slots?: { morning: string; evening: string };
};

export type CombinationState = {
  cautionPairs: CombinationDisplayPair[];
  okPairs: CombinationDisplayPair[];
  affectedProducts: CombinationDisplayProduct[];
  isCollapsed: boolean;
  selectedProductId: string | null;
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
  pendingRemoval: string[];
  implementationDrift: string[];
  excludedIngredients: string[];
};

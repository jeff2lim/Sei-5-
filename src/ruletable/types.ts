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

/**
 * 경과일이 룰테이블 범위(D+0~D+14) 안인지 나타냅니다.
 * - in_window: 해당 날짜 셀을 그대로 사용
 * - after_window: D+14 이후. D+14 셀을 사용하되 그 사실을 호출자에게 알림
 * - before_procedure: 시술일 이전(음수). 판정을 연결하지 않음(unknown)
 * - invalid: NaN·Infinity 등. 판정을 연결하지 않음(unknown)
 */
export type DayCoverage = 'in_window' | 'after_window' | 'before_procedure' | 'invalid';

/**
 * 판정이 입력을 얼마나 덮었는지 나타냅니다. verdict와 별개로 봅니다.
 * - complete: 선택한 판정 대상이 모두 룰에 연결됨
 * - partial: 일부 대상이 unknown이거나, 성분 정보 없이 제형만 판정함
 * - unresolved: 판정 대상이 없거나 전부 unknown
 */
export type EvaluationStatus = 'complete' | 'partial' | 'unresolved';

export type SymptomAdjustment = 'warning_lock' | 'downgraded_one_step';

export type ResolvedTarget = {
  targetType: TargetType;
  targetId: string;
  label: string;
  verdict: DisplayVerdict;
  /** 증상 반영 전, 룰테이블이 낸 판정 */
  baseVerdict: DisplayVerdict;
  /** 증상 때문에 verdict가 baseVerdict보다 보수적으로 바뀐 경우에만 값이 있음 */
  symptomAdjustment: SymptomAdjustment | null;
  dayCoverage: DayCoverage;
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
  evaluationStatus: EvaluationStatus;
  /** 룰에 연결되지 않은 판정 대상(advisory 제외) */
  unknownTargetIds: string[];
  /** 판정에 쓰지 못한 입력. 현재는 성분 미입력만 표시 */
  missingInputs: Array<'ingredients'>;
  dayCoverage: DayCoverage;
  /** 제품 판정에 반영된 가장 강한 증상 조정 */
  symptomAdjustment: SymptomAdjustment | null;
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

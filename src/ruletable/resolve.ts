import {
  baseMakeup,
  behaviorWarnings,
  cleansingMethods,
  combinationPairs,
  ingredientGroups,
  ingredientSynonyms,
  prepBehaviorWarnings,
  productCategories,
  sunscreenTypes,
  symptomDefinitions,
} from './data';
import { expandRuleTable } from './expand';
import type {
  DayCoverage,
  DisplayVerdict,
  EvaluationStatus,
  ProductRuleInput,
  ProductRuleResult,
  ResolvedTarget,
  Sensitivity,
  SensitivityPolicy,
  SymptomAdjustment,
  SymptomAnswerV5,
  SymptomEvaluation,
  TargetType,
  Urgency,
  Verdict,
} from './types';

export const v6RuleTable = expandRuleTable();

const severity: Record<Verdict, number> = { go: 0, care: 1, stop: 2, consult: 3 };
const urgencyRank: Record<Urgency, number> = { monitor: 0, contact_soon: 1, contact_now: 2 };

const legacyTargetAliases: Record<string, string> = {
  'gentle-cleanser': 'mild_acidic_foam',
  'oil-balm': 'cleansing_oil',
  scrub: 'scrub_deep',
  hydrating: 'ceramide',
  'vitamin-c': 'vitamin_c',
  'aha-bha': 'exfoliating_acid',
  'cream-sunscreen': 'serum_lotion',
  'stick-sunscreen': 'waterproof_stick',
  tinted: 'cushion',
};

function targetDefinition(targetType: TargetType, targetId: string) {
  if (targetType === 'ingredient_group') {
    const item = ingredientGroups.find((candidate) => candidate.id === targetId);
    return item
      ? {
          label: item.label,
          policy: item.sensitivity_policy,
          mode: item.judgment_mode,
        }
      : null;
  }
  if (targetType === 'cleansing_method') {
    const item = cleansingMethods.find((candidate) => candidate.id === targetId);
    return item
      ? { label: item.label, policy: item.sensitivity_policy, mode: 'judged' as const }
      : null;
  }
  if (targetType === 'sunscreen_type') {
    const item = sunscreenTypes.find((candidate) => candidate.id === targetId);
    return item
      ? { label: item.label, policy: item.sensitivity_policy, mode: 'judged' as const }
      : null;
  }
  if (targetType === 'base_makeup') {
    const item = baseMakeup.find((candidate) => candidate.id === targetId);
    return item
      ? { label: item.label, policy: item.sensitivity_policy, mode: 'judged' as const }
      : null;
  }
  if (targetType === 'product_category') {
    const item = productCategories.find((candidate) => candidate.id === targetId);
    return item
      ? {
          label: item.label,
          policy: item.sensitivity_policy ?? null,
          mode: 'judged' as const,
        }
      : null;
  }
  return null;
}

/** 룰테이블 v6 본 타임라인이 덮는 경과일 범위 */
export const RULE_WINDOW = { firstDay: 0, lastDay: 14 } as const;

/**
 * 경과일을 룰테이블 조회용 날짜로 바꿉니다.
 * 예전에는 Math.max(0, Math.min(14, day))로 조용히 잘라서
 * D−3이 D+0(stop)으로, D+60이 D+14로 아무 표시 없이 처리됐습니다.
 * 이제는 범위 밖이라는 사실(coverage)을 함께 돌려주고,
 * 시술일 이전·잘못된 값은 조회 자체를 하지 않습니다(tableDay = null → unknown).
 */
export function resolveDayCoverage(day: number): {
  coverage: DayCoverage;
  tableDay: number | null;
} {
  if (!Number.isFinite(day)) return { coverage: 'invalid', tableDay: null };
  const wholeDay = Math.floor(day);
  if (wholeDay < RULE_WINDOW.firstDay) return { coverage: 'before_procedure', tableDay: null };
  if (wholeDay > RULE_WINDOW.lastDay) {
    return { coverage: 'after_window', tableDay: RULE_WINDOW.lastDay };
  }
  return { coverage: 'in_window', tableDay: wholeDay };
}

export function resolveTarget(
  targetType: TargetType,
  rawTargetId: string,
  day: number,
  sensitivity: Sensitivity,
  nextProcedureDay: number | null = null,
): ResolvedTarget {
  const targetId = legacyTargetAliases[rawTargetId] ?? rawTargetId;
  const definition = targetDefinition(targetType, targetId);
  const { coverage, tableDay } = resolveDayCoverage(day);
  if (!definition) {
    return {
      targetType,
      targetId,
      label: targetId,
      verdict: 'unknown',
      baseVerdict: 'unknown',
      symptomAdjustment: null,
      dayCoverage: coverage,
      conditionText: null,
      policy: null,
      judgmentMode: 'judged',
      deferred: false,
      phaseName: day <= 7 ? 'recovery' : 'ramp_up',
      daysToNext: null,
      prepGated: false,
      prepText: null,
    };
  }
  if (definition.mode === 'advisory') {
    return {
      targetType,
      targetId,
      label: definition.label,
      verdict: 'unknown',
      baseVerdict: 'unknown',
      symptomAdjustment: null,
      dayCoverage: coverage,
      conditionText: null,
      policy: definition.policy,
      judgmentMode: definition.mode,
      deferred: false,
      phaseName: day <= 7 ? 'recovery' : 'ramp_up',
      daysToNext: null,
      prepGated: false,
      prepText: null,
    };
  }
  const cell =
    tableDay === null
      ? undefined
      : v6RuleTable.cells.find(
          (candidate) =>
            candidate.target_type === targetType &&
            candidate.target_id === targetId &&
            candidate.sensitivity === sensitivity &&
            candidate.d_day === tableDay,
        );
  const daysToNext = nextProcedureDay === null ? null : nextProcedureDay - day;
  const prepCell =
    daysToNext !== null && daysToNext >= 1 && daysToNext <= 7
      ? v6RuleTable.prep_cells.find(
          (candidate) =>
            candidate.target_type === targetType &&
            candidate.target_id === targetId &&
            candidate.sensitivity === sensitivity &&
            candidate.days_to_next === daysToNext,
        )
      : undefined;
  const mainVerdict = cell?.verdict ?? 'unknown';
  const prepWins =
    prepCell !== undefined &&
    mainVerdict !== 'unknown' &&
    isMoreConservative(prepCell.verdict, mainVerdict);
  const verdict =
    prepCell && mainVerdict !== 'unknown'
      ? moreConservative(mainVerdict, prepCell.verdict)
      : mainVerdict;
  return {
    targetType,
    targetId,
    label: definition.label,
    verdict,
    baseVerdict: verdict,
    symptomAdjustment: null,
    dayCoverage: coverage,
    conditionText: prepWins ? prepCell.condition_text : (cell?.condition_text ?? null),
    policy: definition.policy,
    judgmentMode: definition.mode,
    deferred: cell?.deferred ?? false,
    phaseName: prepCell ? 'prep' : (tableDay ?? 0) <= 7 ? 'recovery' : 'ramp_up',
    daysToNext: prepCell ? daysToNext : null,
    prepGated: prepWins,
    prepText: prepWins
      ? `다음 시술이 ${daysToNext}일 남아서, 오늘은 그대로 쉬어가는 게 좋아요`
      : null,
  };
}

export function moreConservative(a: Verdict, b: Verdict): Verdict {
  if (a === 'consult' || b === 'consult') return 'consult';
  return severity[a] >= severity[b] ? a : b;
}

export function isMoreConservative(candidate: Verdict, baseline: Verdict) {
  if (candidate === 'consult') return baseline !== 'consult';
  if (baseline === 'consult') return false;
  return severity[candidate] > severity[baseline];
}

function maxVerdict(details: ResolvedTarget[]): DisplayVerdict {
  const judged = details.filter(
    (detail): detail is ResolvedTarget & { verdict: Verdict } =>
      detail.judgmentMode !== 'advisory' && detail.verdict !== 'unknown',
  );
  if (!judged.length) return 'unknown';
  return judged.reduce<Verdict>(
    (current, detail) => (severity[detail.verdict] > severity[current] ? detail.verdict : current),
    judged[0].verdict,
  );
}

function verdictText(verdict: DisplayVerdict, label: string) {
  if (verdict === 'consult') return `${label}은 병원에서 받은 안내를 우선해 주세요`;
  if (verdict === 'stop') return `${label} 때문에 아직 쉬어야 해요`;
  if (verdict === 'care') return `${label}은 평소보다 조심해서 사용해 주세요`;
  if (verdict === 'go') return `${label}은 오늘 사용할 수 있어요`;
  return '판정 정보가 없는 제품은 안전하다는 뜻이 아니라, 현재 룰이 연결되지 않은 상태입니다.';
}

/** 경고 증상(section_b)으로 판정이 stop으로 잠겼을 때 함께 보여주는 안내. 체크인 결과 화면과 같은 문장입니다. */
export const WARNING_LOCK_NOTE =
  '오늘은 진정과 보호를 이어가고, 기능성 제품과 메이크업은 중단한 뒤 시술받은 병원에 확인해 주세요.';
export const DOWNGRADE_NOTE =
  '오늘 입력한 반응 때문에 한 단계 조심스럽게 안내했어요. 내일 괜찮아지면 원래대로 돌아와요.';

const adjustmentRank: Record<SymptomAdjustment, number> = {
  downgraded_one_step: 1,
  warning_lock: 2,
};

/**
 * 오늘 체크인한 증상을 개별 판정 대상에 반영합니다.
 * adjustVerdictBySymptoms는 원래 있었지만 앱 어디에서도 호출되지 않아
 * 증상을 입력해도 제품 판정이 그대로였습니다. 여기서 연결합니다.
 * advisory(향료 등 참고용) 대상은 애초에 판정하지 않으므로 건드리지 않습니다.
 */
function applySymptoms(
  detail: ResolvedTarget,
  day: number,
  symptoms: SymptomAnswerV5[],
  nextProcedureDay: number | null,
): ResolvedTarget {
  if (!symptoms.length || detail.judgmentMode === 'advisory') return detail;
  // unknown은 어떤 경우에도 다른 판정으로 바꾸지 않고(unknown 보존),
  // consult(병원 제공)는 병원 안내가 우선이므로 증상으로 덮어쓰지 않습니다.
  if (detail.verdict === 'unknown' || detail.verdict === 'consult') return detail;
  const adjusted = adjustVerdictBySymptoms(
    detail.verdict,
    { type: detail.targetType, id: detail.targetId, policy: detail.policy },
    day,
    symptoms,
    nextProcedureDay,
  );
  if (adjusted.verdict === detail.verdict) return detail;
  return {
    ...detail,
    verdict: adjusted.verdict,
    symptomAdjustment:
      adjusted.evaluation.verdictAdjustment === 'downgraded_one_step'
        ? 'downgraded_one_step'
        : 'warning_lock',
  };
}

export function resolveProduct(
  product: ProductRuleInput,
  day: number,
  sensitivity: Sensitivity,
  nextProcedureDay: number | null = null,
  symptoms: SymptomAnswerV5[] = [],
): ProductRuleResult {
  const resolve = (targetType: TargetType, id: string) =>
    applySymptoms(
      resolveTarget(targetType, id, day, sensitivity, nextProcedureDay),
      day,
      symptoms,
      nextProcedureDay,
    );
  const ingredientDetails = product.ingredientGroupIds.map((id) => resolve('ingredient_group', id));
  const formatDetails = [
    ...product.cleansingMethodIds.map((id) => resolve('cleansing_method', id)),
    ...(product.sunscreenTypeId ? [resolve('sunscreen_type', product.sunscreenTypeId)] : []),
    ...product.baseMakeupIds.map((id) => resolve('base_makeup', id)),
    ...(product.productCategoryId &&
    productCategories.find((category) => category.id === product.productCategoryId)?.timeline_id
      ? [resolve('product_category', product.productCategoryId)]
      : []),
  ];
  const details = [...ingredientDetails, ...formatDetails];
  const advisory = ingredientDetails.filter((detail) => detail.judgmentMode === 'advisory');
  const notes = advisory.map(
    (detail) => `${detail.label}가 있다면 따가움이나 붉은기를 확인하세요.`,
  );
  const selected = (target: { type: 'ingredient_group' | 'cleansing_method'; id: string }) =>
    target.type === 'ingredient_group'
      ? product.ingredientGroupIds.includes(target.id)
      : product.cleansingMethodIds.includes(target.id);
  if (
    combinationPairs.some(
      (pair) => pair.relation !== 'no_restriction' && selected(pair.a) && selected(pair.b),
    )
  ) {
    notes.push('이 제품 하나만 쓰고 다른 기능성 제품은 오늘 쉬어주세요.');
  }
  const missingInputs: Array<'ingredients'> =
    product.ingredientGroupIds.length === 0 && formatDetails.length > 0 ? ['ingredients'] : [];
  if (missingInputs.length) {
    notes.push('성분을 모르시면 회복기엔 쉬어가는 걸 권해요. 제형 판정만 적용했습니다.');
  }

  const symptomAdjustment = details.reduce<SymptomAdjustment | null>(
    (current, detail) =>
      detail.symptomAdjustment &&
      (!current || adjustmentRank[detail.symptomAdjustment] > adjustmentRank[current])
        ? detail.symptomAdjustment
        : current,
    null,
  );
  if (symptomAdjustment === 'warning_lock') notes.push(WARNING_LOCK_NOTE);
  if (symptomAdjustment === 'downgraded_one_step') notes.push(DOWNGRADE_NOTE);

  // advisory는 참고용이라 원래 unknown입니다. 그 외에 unknown인 대상만 '룰 미연결'로 셉니다.
  const judgedDetails = details.filter((detail) => detail.judgmentMode !== 'advisory');
  const unknownTargetIds = judgedDetails
    .filter((detail) => detail.verdict === 'unknown')
    .map((detail) => detail.targetId);
  const evaluationStatus: EvaluationStatus =
    judgedDetails.length === 0 || unknownTargetIds.length === judgedDetails.length
      ? 'unresolved'
      : unknownTargetIds.length > 0 || missingInputs.length > 0
        ? 'partial'
        : 'complete';
  const dayCoverage = resolveDayCoverage(day).coverage;
  const coverageFields = {
    evaluationStatus,
    unknownTargetIds,
    missingInputs,
    dayCoverage,
    symptomAdjustment,
  };

  const consult = details.find((detail) => detail.verdict === 'consult');
  if (consult) {
    return {
      verdict: 'consult',
      decidingAxis: 'consult',
      decidingTarget: consult.targetId,
      primaryText: verdictText('consult', consult.label),
      secondaryText: consult.conditionText,
      prepText: consult.prepText,
      notes,
      details,
      ...coverageFields,
    };
  }

  const ingredientVerdict = maxVerdict(ingredientDetails);
  const formatVerdict = maxVerdict(formatDetails);
  const available = [ingredientVerdict, formatVerdict].filter(
    (verdict): verdict is Verdict => verdict !== 'unknown',
  );
  const knownVerdict = available.length
    ? available.reduce<Verdict>(
        (current, candidate) => (severity[candidate] > severity[current] ? candidate : current),
        available[0],
      )
    : 'unknown';
  // 예전에는 unknown 대상을 집계에서 빼기만 해서, 세라마이드(go) + 룰에 없는 성분(unknown)이
  // 최종 go로 나왔습니다. README의 "unknown을 go로 바꾸지 않습니다"와 어긋납니다.
  // 순위는 앱 쪽과 같게 go < unknown < care < stop: go만 unknown에 밀리고, care·stop은 유지됩니다.
  const verdict: DisplayVerdict =
    knownVerdict === 'go' && unknownTargetIds.length > 0 ? 'unknown' : knownVerdict;
  const decidingIngredient = ingredientVerdict === verdict;
  const decidingFormat = formatVerdict === verdict;
  const prepDecisive = details.some((detail) => detail.prepGated && detail.verdict === verdict);
  const decidingAxis = prepDecisive
    ? 'prep_gate'
    : verdict === 'unknown'
      ? 'none'
      : decidingIngredient && decidingFormat
        ? 'both'
        : decidingIngredient
          ? 'ingredient'
          : 'format';
  const decisive = details
    .filter((detail) => detail.verdict === verdict && detail.judgmentMode === 'judged')
    .sort((a, b) => {
      const reopen = (targetId: string) => {
        const timeline = v6RuleTable.timelines.find(
          (candidate) => candidate.target_id === targetId && candidate.sensitivity === sensitivity,
        );
        return timeline?.true_reopen_d ?? timeline?.reopen_d_day ?? -1;
      };
      return reopen(b.targetId) - reopen(a.targetId);
    })[0];

  return {
    verdict,
    decidingAxis,
    decidingTarget: decisive?.targetId ?? null,
    primaryText: verdictText(verdict, decisive?.label ?? product.productName),
    secondaryText: decisive?.conditionText ?? null,
    prepText: decisive?.prepText ?? null,
    notes,
    details,
    ...coverageFields,
  };
}

export function matchIngredientGroup(rawIngredient: string): string | null {
  const normalized = rawIngredient.trim().toLocaleLowerCase();
  for (const [id, dictionary] of Object.entries(ingredientSynonyms)) {
    if ((dictionary.excluded ?? []).some((value) => value.toLocaleLowerCase() === normalized)) {
      return null;
    }
    if (dictionary.all.some((value) => value.toLocaleLowerCase() === normalized)) return id;
  }
  return null;
}

const excludedIngredientText =
  "연고·의약품은 등록 대상이 아니에요. 병원에서 받은 제품이라면 '병원 제공'으로 등록해 주세요.";

export function matchIngredientInput(rawIngredient: string): {
  groupId: string | null;
  excluded: boolean;
  message: string | null;
} {
  const normalized = rawIngredient.trim().toLocaleLowerCase();
  for (const [id, dictionary] of Object.entries(ingredientSynonyms)) {
    if ((dictionary.excluded ?? []).some((value) => value.toLocaleLowerCase() === normalized)) {
      return { groupId: null, excluded: true, message: excludedIngredientText };
    }
    if (dictionary.all.some((value) => value.toLocaleLowerCase() === normalized)) {
      return { groupId: id, excluded: false, message: null };
    }
  }
  return { groupId: null, excluded: false, message: null };
}

export function effectiveRemovalPower(removalPower: number, verdict: DisplayVerdict) {
  if (verdict === 'go') return removalPower;
  if (verdict === 'care') return Math.max(1, removalPower - 1);
  return 0;
}

export function maxPermittedRemovalPower(
  day: number,
  sensitivity: Sensitivity,
  nextProcedureDay: number | null = null,
) {
  return cleansingMethods.reduce(
    (maximum, method) =>
      Math.max(
        maximum,
        effectiveRemovalPower(
          method.removal_power,
          resolveTarget('cleansing_method', method.id, day, sensitivity, nextProcedureDay).verdict,
        ),
      ),
    0,
  );
}

export function computeLayeredBurden(sunscreenTypeId: string, makeupItemIds: string[]) {
  const sunscreen = sunscreenTypes.find((item) => item.id === sunscreenTypeId);
  if (!sunscreen) throw new Error(`알 수 없는 자외선 차단 타입: ${sunscreenTypeId}`);
  const makeup = makeupItemIds.map((id) => {
    const item = baseMakeup.find((candidate) => candidate.id === id);
    if (!item) throw new Error(`알 수 없는 베이스 메이크업: ${id}`);
    return item;
  });
  const burdens = [
    sunscreen.required_removal_power,
    ...makeup.map((item) => item.cleansing_burden),
  ];
  const base = Math.max(...burdens);
  const heavy = Math.max(0, burdens.filter((burden) => burden >= 3).length - 1);
  return Math.min(5, base + Math.ceil(heavy / 2));
}

export function resolveSunscreenCleansing(
  sunscreenTypeId: string,
  makeupItemIds: string[],
  day: number,
  sensitivity: Sensitivity,
  nextProcedureDay: number | null = null,
) {
  const required = computeLayeredBurden(sunscreenTypeId, makeupItemIds);
  const candidates = cleansingMethods
    .map((method) => ({
      method,
      permitted: effectiveRemovalPower(
        method.removal_power,
        resolveTarget('cleansing_method', method.id, day, sensitivity, nextProcedureDay).verdict,
      ),
    }))
    .filter((candidate) => candidate.permitted >= required)
    .sort(
      (a, b) =>
        a.method.removal_power - b.method.removal_power || a.method.friction - b.method.friction,
    );
  if (candidates[0]) {
    return {
      ok: true as const,
      required,
      permitted: candidates[0].permitted,
      method: candidates[0].method.id,
      suggestions: [] as string[],
    };
  }
  return {
    ok: false as const,
    required,
    permitted: maxPermittedRemovalPower(day, sensitivity, nextProcedureDay),
    reason: 'removal_burden_exceeds_permitted_cleansing' as const,
    suggestions: ['switch_to_lower_burden_sunscreen', 'reduce_makeup_layers'],
  };
}

export function activeBehaviorWarnings(day: number, screen: 'cleansing' | 'skincare' | 'outing') {
  return behaviorWarnings.filter(
    (warning) =>
      day >= warning.from_d &&
      day <= warning.to_d &&
      (warning.screen === screen || warning.screen === 'common'),
  );
}

export function activePrepBehaviorWarnings(daysToNext: number | null) {
  if (daysToNext === null || daysToNext < 1) return [];
  return prepBehaviorWarnings.filter((warning) => daysToNext <= warning.from_dtn);
}

export function evaluateSymptoms(day: number, answers: SymptomAnswerV5[]): SymptomEvaluation {
  const warningSignals = symptomDefinitions.section_b
    .filter((definition) => answers.some((answer) => answer.id === definition.id && answer.present))
    .map((definition) => ({
      id: definition.id,
      urgency: definition.urgency,
      reason: 'warning_direct',
    }));
  const recoverySignals = symptomDefinitions.section_a.flatMap((definition) => {
    const answer = answers.find((candidate) => candidate.id === definition.id && candidate.present);
    if (!answer) return [];
    const reason =
      answer.severity === 3
        ? 'severity_high'
        : day > definition.expected_resolution_d
          ? 'past_expected_resolution'
          : 'recorded';
    return [{ id: definition.id, severity: answer.severity, reason }];
  });
  const urgency = warningSignals.reduce<Urgency | null>(
    (current, signal) =>
      !current || urgencyRank[signal.urgency] > urgencyRank[current] ? signal.urgency : current,
    null,
  );
  const notes = answers.some(
    (answer) => answer.id === 'dryness' && answer.present && answer.severity === 3,
  )
    ? ['건조가 심하네요. 보습제를 평소보다 자주, 두껍게 발라주세요.']
    : [];
  return {
    overallUrgency: urgency,
    triggered: [...warningSignals, ...recoverySignals],
    verdictAdjustment: warningSignals.length ? 'warning_lock' : null,
    notes,
  };
}

export function hasDowngradeTrigger(day: number, answers: SymptomAnswerV5[]) {
  const triggerDefinitions = symptomDefinitions.section_a.filter(
    (definition) => definition.id !== 'dryness',
  );
  const hasDirectTrigger = triggerDefinitions.some((definition) => {
    const answer = answers.find((candidate) => candidate.id === definition.id && candidate.present);
    return Boolean(answer && (answer.severity === 3 || day > definition.expected_resolution_d));
  });
  const moderateCount = answers.filter(
    (answer) => answer.present && answer.id !== 'dryness' && (answer.severity ?? 0) >= 2,
  ).length;
  return hasDirectTrigger || moderateCount >= 2;
}

export function adjustVerdictBySymptoms(
  verdict: DisplayVerdict,
  target: { type: TargetType; id: string; policy: SensitivityPolicy | null },
  day: number,
  answers: SymptomAnswerV5[],
  nextProcedureDay: number | null = null,
) {
  const evaluation = evaluateSymptoms(day, answers);
  const daysToNext = nextProcedureDay === null ? null : nextProcedureDay - day;
  if (daysToNext !== null && daysToNext >= 1 && daysToNext <= 7) {
    return { verdict, evaluation };
  }
  const hasWarning = evaluation.overallUrgency !== null;
  if (hasWarning) {
    const warningLocked =
      (target.type === 'ingredient_group' && target.policy !== 'restorative') ||
      target.type === 'base_makeup' ||
      (target.type === 'cleansing_method' &&
        ['cleansing_oil', 'cleansing_balm', 'double_cleanse'].includes(target.id));
    if (warningLocked) return { verdict: 'stop' as const, evaluation };
    return { verdict, evaluation };
  }

  const triggerDefinitions = symptomDefinitions.section_a.filter(
    (definition) => definition.id !== 'dryness',
  );
  const triggers = triggerDefinitions.filter((definition) => {
    const answer = answers.find((candidate) => candidate.id === definition.id && candidate.present);
    return Boolean(answer && (answer.severity === 3 || day > definition.expected_resolution_d));
  });
  const shouldDowngrade = hasDowngradeTrigger(day, answers);
  if (!shouldDowngrade || verdict === 'unknown' || verdict === 'consult')
    return { verdict, evaluation };
  if (triggers.length === 1 && triggers[0].id === 'breakout' && target.policy !== 'irritant') {
    return { verdict, evaluation };
  }
  if (target.policy === 'restorative' || target.type === 'sunscreen_type')
    return { verdict, evaluation };
  const downgraded: DisplayVerdict =
    verdict === 'go' ? 'care' : verdict === 'care' ? 'stop' : verdict;
  return {
    verdict: downgraded,
    evaluation: {
      ...evaluation,
      verdictAdjustment: 'downgraded_one_step' as const,
      notes: [...evaluation.notes, DOWNGRADE_NOTE],
    },
  };
}

export function consecutiveDowngradeDays(history: Array<{ date: string; downgraded: boolean }>) {
  const sorted = [...new Map(history.map((entry) => [entry.date, entry])).values()].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  let count = 0;
  let previousDate: Date | null = null;
  for (const entry of sorted) {
    if (!entry.downgraded) break;
    const currentDate = new Date(`${entry.date}T00:00:00`);
    if (previousDate && previousDate.getTime() - currentDate.getTime() !== 86_400_000) break;
    count += 1;
    previousDate = currentDate;
  }
  return count;
}

import {
  baseMakeup,
  behaviorWarnings,
  cleansingMethods,
  ingredientGroups,
  ingredientSynonyms,
  productCategories,
  sunscreenTypes,
  symptomDefinitions,
} from './data';
import { expandRuleTable } from './expand';
import type {
  DisplayVerdict,
  ProductRuleInput,
  ProductRuleResult,
  ResolvedTarget,
  Sensitivity,
  SensitivityPolicy,
  SymptomAnswerV5,
  SymptomEvaluation,
  TargetType,
  Urgency,
  Verdict,
} from './types';

export const v5RuleTable = expandRuleTable();

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

export function resolveTarget(
  targetType: TargetType,
  rawTargetId: string,
  day: number,
  sensitivity: Sensitivity,
): ResolvedTarget {
  const targetId = legacyTargetAliases[rawTargetId] ?? rawTargetId;
  const definition = targetDefinition(targetType, targetId);
  if (!definition) {
    return {
      targetType,
      targetId,
      label: targetId,
      verdict: 'unknown',
      conditionText: null,
      policy: null,
      judgmentMode: 'judged',
      deferred: false,
    };
  }
  if (definition.mode === 'advisory') {
    return {
      targetType,
      targetId,
      label: definition.label,
      verdict: 'unknown',
      conditionText: null,
      policy: definition.policy,
      judgmentMode: definition.mode,
      deferred: false,
    };
  }
  const safeDay = Math.max(0, Math.min(14, day));
  const cell = v5RuleTable.cells.find(
    (candidate) =>
      candidate.target_type === targetType &&
      candidate.target_id === targetId &&
      candidate.sensitivity === sensitivity &&
      candidate.d_day === safeDay,
  );
  return {
    targetType,
    targetId,
    label: definition.label,
    verdict: cell?.verdict ?? 'unknown',
    conditionText: cell?.condition_text ?? null,
    policy: definition.policy,
    judgmentMode: definition.mode,
    deferred: cell?.deferred ?? false,
  };
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
  return '연결된 판정 정보가 없습니다';
}

export function resolveProduct(
  product: ProductRuleInput,
  day: number,
  sensitivity: Sensitivity,
): ProductRuleResult {
  const ingredientDetails = product.ingredientGroupIds.map((id) =>
    resolveTarget('ingredient_group', id, day, sensitivity),
  );
  const formatDetails = [
    ...product.cleansingMethodIds.map((id) =>
      resolveTarget('cleansing_method', id, day, sensitivity),
    ),
    ...(product.sunscreenTypeId
      ? [resolveTarget('sunscreen_type', product.sunscreenTypeId, day, sensitivity)]
      : []),
    ...product.baseMakeupIds.map((id) => resolveTarget('base_makeup', id, day, sensitivity)),
    ...(product.productCategoryId &&
    productCategories.find((category) => category.id === product.productCategoryId)?.timeline_id
      ? [resolveTarget('product_category', product.productCategoryId, day, sensitivity)]
      : []),
  ];
  const details = [...ingredientDetails, ...formatDetails];
  const advisory = ingredientDetails.filter((detail) => detail.judgmentMode === 'advisory');
  const notes = advisory.map(
    (detail) => `${detail.label}가 있다면 따가움이나 붉은기를 확인하세요.`,
  );
  if (product.ingredientGroupIds.length === 0 && formatDetails.length > 0) {
    notes.push('성분을 모르시면 회복기엔 쉬어가는 걸 권해요. 제형 판정만 적용했습니다.');
  }

  const consult = details.find((detail) => detail.verdict === 'consult');
  if (consult) {
    return {
      verdict: 'consult',
      decidingAxis: 'consult',
      decidingTarget: consult.targetId,
      primaryText: verdictText('consult', consult.label),
      secondaryText: consult.conditionText,
      notes,
      details,
    };
  }

  const ingredientVerdict = maxVerdict(ingredientDetails);
  const formatVerdict = maxVerdict(formatDetails);
  const available = [ingredientVerdict, formatVerdict].filter(
    (verdict): verdict is Verdict => verdict !== 'unknown',
  );
  const verdict = available.length
    ? available.reduce<Verdict>(
        (current, candidate) => (severity[candidate] > severity[current] ? candidate : current),
        available[0],
      )
    : 'unknown';
  const decidingIngredient = ingredientVerdict === verdict;
  const decidingFormat = formatVerdict === verdict;
  const decidingAxis =
    verdict === 'unknown'
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
        const timeline = v5RuleTable.timelines.find(
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
    notes,
    details,
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

export function effectiveRemovalPower(removalPower: number, verdict: DisplayVerdict) {
  if (verdict === 'go') return removalPower;
  if (verdict === 'care') return Math.max(1, removalPower - 1);
  return 0;
}

export function maxPermittedRemovalPower(day: number, sensitivity: Sensitivity) {
  return cleansingMethods.reduce(
    (maximum, method) =>
      Math.max(
        maximum,
        effectiveRemovalPower(
          method.removal_power,
          resolveTarget('cleansing_method', method.id, day, sensitivity).verdict,
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
) {
  const required = computeLayeredBurden(sunscreenTypeId, makeupItemIds);
  const candidates = cleansingMethods
    .map((method) => ({
      method,
      permitted: effectiveRemovalPower(
        method.removal_power,
        resolveTarget('cleansing_method', method.id, day, sensitivity).verdict,
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
    permitted: maxPermittedRemovalPower(day, sensitivity),
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
) {
  const evaluation = evaluateSymptoms(day, answers);
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
  const downgraded = verdict === 'go' ? 'care' : verdict === 'care' ? 'stop' : verdict;
  return {
    verdict: downgraded,
    evaluation: {
      ...evaluation,
      verdictAdjustment: 'downgraded_one_step' as const,
      notes: [
        ...evaluation.notes,
        '오늘 입력한 반응 때문에 한 단계 조심스럽게 안내했어요. 내일 괜찮아지면 원래대로 돌아와요.',
      ],
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

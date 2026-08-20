import type { CheckIn, ContactAction } from '@/domain/check-in';
import type { Product, ProductCategory, VerdictLevel } from '@/domain/product';
import type { Sensitivity } from '@/domain/procedure';
import type { AttributeVerdict, CategoryVerdict, ProductVerdict } from '@/domain/verdict';
import { baseMakeup, cleansingMethods, ingredientGroups, sunscreenTypes } from '@/ruletable/data';
import { evaluateSymptoms, resolveProduct, resolveTarget, v6RuleTable } from '@/ruletable/resolve';
import type { ProductRuleSelection, TargetType } from '@/ruletable/types';

const rank: Record<VerdictLevel, number> = {
  go: 0,
  unknown: 1,
  care: 2,
  stop: 3,
  consult: 4,
};

const ingredientBenefits: Record<string, string> = {
  ceramide: '피부 장벽 강화와 보습',
  hyaluronic_acid: '수분 보충과 보습',
  panthenol: '보습과 진정',
  cica: '피부 진정과 회복',
  egf: '피부 재생과 회복',
  pdrn: '피부 재생과 회복',
  exosome: '피부 진정과 회복',
  zinc: '피지 조절과 진정',
  niacinamide: '피부 장벽 강화와 톤 개선',
  brightening_functional: '색소 관리와 톤 개선',
  vitamin_c: '항산화와 톤 개선',
  acne_active: '트러블 관리',
  retinoid: '피부 결 개선',
  exfoliating_acid: '각질 정돈',
};

const ingredientStopReasons: Record<string, string> = {
  egf: '회복 초기의 예민한 피부에는 자극이 될 수 있어 지금은 쉬어야 해요.',
  pdrn: '회복 초기의 예민한 피부에는 자극이 될 수 있어 지금은 쉬어야 해요.',
  exosome: '회복 초기의 예민한 피부에는 자극이 될 수 있어 지금은 쉬어야 해요.',
  zinc: '회복 직후에는 따갑거나 건조하게 느껴질 수 있어 지금은 쉬어야 해요.',
  niacinamide: '회복 직후에는 따갑거나 붉어질 수 있어 지금은 쉬어야 해요.',
  brightening_functional: '회복 직후의 피부에 따가움과 붉은기를 키울 수 있어 지금은 쉬어야 해요.',
  vitamin_c: '산성 성분이 회복 중인 피부를 자극할 수 있어 지금은 쉬어야 해요.',
  acne_active: '활성 성분이 회복 중인 피부의 자극을 키울 수 있어 지금은 쉬어야 해요.',
  retinoid: '피부 턴오버를 촉진해 회복 중 자극과 건조를 키울 수 있어 지금은 쉬어야 해요.',
  exfoliating_acid: '각질을 벗겨 회복 중인 피부의 자극을 키울 수 있어 지금은 쉬어야 해요.',
};

function detailReason(detail: ReturnType<typeof resolveTarget>, fallback: string) {
  if (detail.prepText) return detail.prepText;
  if (detail.conditionText) return detail.conditionText;
  if (detail.targetType !== 'ingredient_group') return fallback;

  if (detail.verdict === 'go') {
    const benefit = ingredientBenefits[detail.targetId];
    return benefit
      ? `${benefit}에 도움을 주는 성분이에요.`
      : `${detail.label}은 오늘 사용할 수 있어요.`;
  }
  if (detail.verdict === 'care') {
    return `${ingredientBenefits[detail.targetId] ?? detail.label}에 도움을 주지만, 회복 중인 피부에는 소량부터 조심해서 사용해야 해요.`;
  }
  if (detail.verdict === 'stop') {
    return (
      ingredientStopReasons[detail.targetId] ??
      '회복 중인 피부의 자극을 키울 수 있어 지금은 쉬어야 해요.'
    );
  }
  if (detail.verdict === 'consult') return '병원에서 받은 사용 안내를 우선해 주세요.';
  return '현재 연결된 판정 정보가 부족해요.';
}

const legacyAliases: Record<string, { type: TargetType; id: string }> = {
  'gentle-cleanser': { type: 'cleansing_method', id: 'mild_acidic_foam' },
  'oil-balm': { type: 'cleansing_method', id: 'cleansing_oil' },
  scrub: { type: 'cleansing_method', id: 'scrub_deep' },
  hydrating: { type: 'ingredient_group', id: 'ceramide' },
  niacinamide: { type: 'ingredient_group', id: 'niacinamide' },
  'vitamin-c': { type: 'ingredient_group', id: 'vitamin_c' },
  retinoid: { type: 'ingredient_group', id: 'retinoid' },
  'aha-bha': { type: 'ingredient_group', id: 'exfoliating_acid' },
  fragrance: { type: 'ingredient_group', id: 'fragrance' },
  'cream-sunscreen': { type: 'sunscreen_type', id: 'serum_lotion' },
  'stick-sunscreen': { type: 'sunscreen_type', id: 'waterproof_stick' },
  tinted: { type: 'base_makeup', id: 'cushion' },
};

function inferTarget(attributeId: string): { type: TargetType; id: string } {
  if (legacyAliases[attributeId]) return legacyAliases[attributeId];
  if (ingredientGroups.some((item) => item.id === attributeId)) {
    return { type: 'ingredient_group', id: attributeId };
  }
  if (cleansingMethods.some((item) => item.id === attributeId)) {
    return { type: 'cleansing_method', id: attributeId };
  }
  if (sunscreenTypes.some((item) => item.id === attributeId)) {
    return { type: 'sunscreen_type', id: attributeId };
  }
  if (baseMakeup.some((item) => item.id === attributeId)) {
    return { type: 'base_makeup', id: attributeId };
  }
  return { type: 'ingredient_group', id: attributeId };
}

export function evaluateAttribute(
  attributeId: string,
  procedureDay: number,
  sensitivity: Sensitivity = 'normal',
  nextProcedureDay: number | null = null,
): AttributeVerdict {
  const target = inferTarget(attributeId);
  const detail = resolveTarget(target.type, target.id, procedureDay, sensitivity, nextProcedureDay);
  return {
    attributeId: detail.targetId,
    targetType: detail.targetType,
    label: detail.label,
    level: detail.verdict,
    reason: detail.conditionText ?? `${detail.label}: ${detail.verdict}`,
  };
}

function migrateLegacySelection(product: Product): ProductRuleSelection {
  const selection: ProductRuleSelection = {
    ingredientGroupIds: [],
    cleansingMethodIds: [],
    baseMakeupIds: [],
  };
  for (const attributeId of product.attributeIds) {
    const target = inferTarget(attributeId);
    if (target.type === 'ingredient_group') selection.ingredientGroupIds.push(target.id);
    if (target.type === 'cleansing_method') selection.cleansingMethodIds.push(target.id);
    if (target.type === 'base_makeup') selection.baseMakeupIds.push(target.id);
    if (target.type === 'sunscreen_type') selection.sunscreenTypeId = target.id;
  }
  return selection;
}

export function evaluateProduct(
  product: Product,
  procedureDay: number,
  sensitivity: Sensitivity = 'normal',
  nextProcedureDay: number | null = null,
): ProductVerdict {
  const selection = product.ruleSelection ?? migrateLegacySelection(product);
  const resolved = resolveProduct(
    {
      productId: product.id,
      productName: product.name,
      ...selection,
    },
    procedureDay,
    sensitivity,
    nextProcedureDay,
  );
  const decisiveTimeline = v6RuleTable.timelines.find(
    (timeline) =>
      timeline.target_id === resolved.decidingTarget && timeline.sensitivity === sensitivity,
  );
  return {
    productId: product.id,
    level: resolved.verdict,
    resumeDay: decisiveTimeline?.reopen_d_day ?? undefined,
    decisiveAttributeId: resolved.decidingTarget ?? undefined,
    decidingAxis: resolved.decidingAxis,
    prepText: resolved.prepText ?? undefined,
    notes: resolved.notes,
    details: resolved.details.map((detail) => ({
      attributeId: detail.targetId,
      targetType: detail.targetType,
      label: detail.label,
      level: detail.verdict,
      resumeDay:
        v6RuleTable.timelines.find(
          (timeline) =>
            timeline.target_id === detail.targetId && timeline.sensitivity === sensitivity,
        )?.reopen_d_day ?? undefined,
      reason: detailReason(detail, resolved.primaryText),
    })),
    rulePackVersion: v6RuleTable.version,
  };
}

export function evaluateProducts(
  products: Product[],
  procedureDay: number,
  sensitivity: Sensitivity = 'normal',
  nextProcedureDay: number | null = null,
): ProductVerdict[] {
  return products.map((product) =>
    evaluateProduct(product, procedureDay, sensitivity, nextProcedureDay),
  );
}

export function evaluateCategory(
  category: ProductCategory,
  products: Product[],
  procedureDay: number,
  sensitivity: Sensitivity = 'normal',
  nextProcedureDay: number | null = null,
): CategoryVerdict {
  const matchingProducts = products.filter((product) => product.category === category);
  const verdicts = evaluateProducts(matchingProducts, procedureDay, sensitivity, nextProcedureDay);
  const level = verdicts.reduce<VerdictLevel>(
    (current, verdict) => (rank[verdict.level] > rank[current] ? verdict.level : current),
    'unknown',
  );
  return { category, level, products: verdicts };
}

export function evaluateCheckIn(checkIn: CheckIn): ContactAction {
  const result = evaluateSymptoms(
    Math.max(0, Math.min(14, checkIn.procedureDay ?? 0)),
    checkIn.answers.map((answer) => ({
      id: answer.symptomId,
      present: answer.present,
      severity: answer.severity,
    })),
  );
  if (result.overallUrgency === 'contact_now') {
    return {
      type: 'CONTACT_CLINIC_PROMPTLY',
      title: '병원 확인이 필요해 보여요',
      body: '오늘은 진정과 보호를 이어가고, 기능성 제품과 메이크업은 중단한 뒤 시술받은 병원에 확인해 주세요.',
    };
  }
  if (result.overallUrgency === 'contact_soon') {
    return {
      type: 'CONTACT_CLINIC',
      title: '시술받은 병원에 확인해 주세요',
      body: '기본 보습과 자외선 차단은 이어가면서 입력한 변화를 병원에 확인해 주세요.',
    };
  }
  return {
    type: 'CONTINUE_GUIDE',
    title: '오늘 안내를 이어가세요',
    body:
      result.notes[0] ??
      '입력한 경과를 기록했습니다. 증상이 새로 생기거나 심해지면 시술받은 병원에 문의하세요.',
  };
}

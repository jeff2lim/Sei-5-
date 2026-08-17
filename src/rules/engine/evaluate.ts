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
      reason: detail.prepText ?? detail.conditionText ?? resolved.primaryText,
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
  const verdicts = evaluateProducts(
    matchingProducts,
    procedureDay,
    sensitivity,
    nextProcedureDay,
  );
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

import { cleansingMethods, combinationPairs, ingredientGroups, symptomDefinitions } from './data';
import { expandRuleTable } from './expand';
import { resolveTarget } from './resolve';
import type {
  CombinationPair,
  CombinationDisplayPair,
  CombinationDisplayProduct,
  CombinationGuideCategory,
  CombinationProduct,
  CombinationState,
  CombinationTarget,
  CombinationUiProduct,
  DisplayVerdict,
  GeneratedCombination,
  ProductRuleSelection,
  Sensitivity,
  SymptomAnswerV5,
} from './types';

const table = expandRuleTable();

function activeStart(pair: CombinationPair, sensitivity: Sensitivity) {
  const targetStart = (target: CombinationTarget) => {
    const timeline = table.timelines.find(
      (candidate) =>
        candidate.target_type === target.type &&
        candidate.target_id === target.id &&
        candidate.sensitivity === sensitivity,
    );
    if (!timeline) throw new Error(`${pair.pair_id}: ${target.type}:${target.id} 타임라인 없음`);
    return {
      start: timeline.care_start_d ?? timeline.reopen_d_day ?? 0,
      deferred: timeline.deferred,
    };
  };
  const a = targetStart(pair.a);
  const b = targetStart(pair.b);
  return a.deferred || b.deferred ? 14 : Math.max(a.start, b.start);
}

export function buildCombinations(
  sensitivity: Sensitivity,
  nextProcedureDay: number | null = null,
): GeneratedCombination[] {
  return combinationPairs.flatMap((pair) => {
    const activeFrom = activeStart(pair, sensitivity);
    if (activeFrom > 14) return [];
    if (nextProcedureDay !== null && activeFrom > nextProcedureDay - 7) return [];
    return [{ ...pair, sensitivity, active_from_d: activeFrom }];
  });
}

function productHasTarget(product: CombinationProduct, target: CombinationTarget) {
  return target.type === 'ingredient_group'
    ? product.ingredientGroupIds.includes(target.id)
    : product.cleansingMethodIds.includes(target.id);
}

function productsWithTarget(products: CombinationProduct[], target: CombinationTarget) {
  return products.filter((product) => productHasTarget(product, target));
}

function sameProductHasBoth(
  products: CombinationProduct[],
  pair: Pick<CombinationPair, 'a' | 'b'>,
) {
  return products.some(
    (product) => productHasTarget(product, pair.a) && productHasTarget(product, pair.b),
  );
}

function hasSectionBWarning(symptoms: SymptomAnswerV5[]) {
  const ids = new Set(symptomDefinitions.section_b.map((warning) => warning.id));
  return symptoms.some((symptom) => symptom.present && ids.has(symptom.id));
}

export function activePairs({
  day,
  sensitivity,
  userProducts,
  symptoms = [],
  nextProcedureDay = null,
}: {
  day: number;
  sensitivity: Sensitivity;
  userProducts: CombinationProduct[];
  symptoms?: SymptomAnswerV5[];
  nextProcedureDay?: number | null;
}) {
  const daysToNext = nextProcedureDay === null ? null : nextProcedureDay - day;
  if (hasSectionBWarning(symptoms)) return [];
  if (daysToNext !== null && daysToNext >= 1 && daysToNext <= 7) return [];

  return buildCombinations(sensitivity, nextProcedureDay).filter((pair) => {
    if (day < pair.active_from_d) return false;
    if (!productsWithTarget(userProducts, pair.a).length) return false;
    if (!productsWithTarget(userProducts, pair.b).length) return false;
    if (sameProductHasBoth(userProducts, pair)) return false;
    const a = resolveTarget(pair.a.type, pair.a.id, day, sensitivity, nextProcedureDay);
    const b = resolveTarget(pair.b.type, pair.b.id, day, sensitivity, nextProcedureDay);
    return a.verdict !== 'stop' && b.verdict !== 'stop';
  });
}

export function sameProductCombinationNotes(userProducts: CombinationProduct[]) {
  const notes: Record<string, string[]> = {};
  for (const pair of combinationPairs) {
    if (pair.relation === 'no_restriction') continue;
    for (const product of userProducts) {
      if (!productHasTarget(product, pair.a) || !productHasTarget(product, pair.b)) continue;
      notes[product.productId] = [
        ...(notes[product.productId] ?? []),
        '이 제품 하나만 쓰고 다른 기능성 제품은 오늘 쉬어주세요.',
      ];
    }
  }
  return notes;
}

function targetLabel(target: CombinationTarget) {
  const definition =
    target.type === 'ingredient_group'
      ? ingredientGroups.find((candidate) => candidate.id === target.id)
      : cleansingMethods.find((candidate) => candidate.id === target.id);
  return definition?.label ?? target.id;
}

function uniqueProducts(products: CombinationDisplayProduct[]) {
  return [...new Map(products.map((product) => [product.productId, product])).values()];
}

export function resolveCombinationState({
  day,
  sensitivity,
  userProducts,
  symptoms = [],
  nextProcedureDay = null,
  selectedProductId = null,
}: {
  day: number;
  sensitivity: Sensitivity;
  userProducts: CombinationUiProduct[];
  symptoms?: SymptomAnswerV5[];
  nextProcedureDay?: number | null;
  selectedProductId?: string | null;
}): CombinationState {
  const eligible = userProducts.filter(
    (product) => product.verdict === 'go' || product.verdict === 'care',
  );
  const pairs = activePairs({
    day,
    sensitivity,
    userProducts: eligible,
    symptoms,
    nextProcedureDay,
  }).flatMap<CombinationDisplayPair>((pair) => {
    const aProducts = eligible.filter((product) => productHasTarget(product, pair.a));
    const bProducts = eligible.filter((product) => productHasTarget(product, pair.b));
    const products = uniqueProducts(
      [...aProducts, ...bProducts].map(({ productId, name, category }) => ({
        productId,
        name,
        category,
      })),
    );
    if (!aProducts.length || !bProducts.length || products.length < 2) return [];
    const slots =
      pair.relation === 'separate_time' && aProducts[0] && bProducts[0]
        ? pair.slot_a === 'morning'
          ? { morning: aProducts[0].productId, evening: bProducts[0].productId }
          : { morning: bProducts[0].productId, evening: aProducts[0].productId }
        : undefined;
    return [
      {
        pairId: pair.pair_id,
        relation: pair.relation,
        ingredientLabels: [targetLabel(pair.a), targetLabel(pair.b)],
        products,
        userText: pair.user_text,
        reasonText: pair.reason_text,
        activeFromD: pair.active_from_d,
        slots,
      },
    ];
  });
  const cautionPairs = pairs.filter((pair) => pair.relation !== 'no_restriction');
  const okPairs = pairs.filter((pair) => pair.relation === 'no_restriction');
  const affectedProducts = uniqueProducts(cautionPairs.flatMap((pair) => pair.products));
  return {
    cautionPairs,
    okPairs,
    affectedProducts,
    isCollapsed: cautionPairs.length >= 3,
    selectedProductId: affectedProducts.some((product) => product.productId === selectedProductId)
      ? selectedProductId
      : null,
  };
}

export function combinationsForCategory(
  state: CombinationState,
  category: CombinationGuideCategory,
): CombinationState {
  const cautionPairs = state.cautionPairs.filter((pair) =>
    pair.products.some((product) => product.category === category),
  );
  const okPairs = state.okPairs.filter((pair) =>
    pair.products.some((product) => product.category === category),
  );
  const affectedProducts = uniqueProducts(
    cautionPairs
      .flatMap((pair) => pair.products)
      .filter((product) => product.category === category),
  );
  return {
    ...state,
    cautionPairs,
    okPairs,
    affectedProducts,
    isCollapsed: cautionPairs.length >= 3,
  };
}

export function toCombinationUiProduct(
  product: {
    id: string;
    name: string;
    category: CombinationGuideCategory;
    ruleSelection?: ProductRuleSelection;
    attributeIds: string[];
  },
  verdict: DisplayVerdict,
): CombinationUiProduct {
  return {
    productId: product.id,
    name: product.name,
    category: product.category,
    ingredientGroupIds:
      product.ruleSelection?.ingredientGroupIds ??
      product.attributeIds.filter((id) =>
        ingredientGroups.some((candidate) => candidate.id === id),
      ),
    cleansingMethodIds:
      product.ruleSelection?.cleansingMethodIds ??
      product.attributeIds.filter((id) =>
        cleansingMethods.some((candidate) => candidate.id === id),
      ),
    verdict,
  };
}

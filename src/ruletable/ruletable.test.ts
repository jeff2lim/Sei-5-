import { describe, expect, it } from 'vitest';
import {
  activePairs,
  buildCombinations,
  combinationsForCategory,
  resolveCombinationState,
  sameProductCombinationNotes,
} from './combine';
import { getNextProcedureDay } from './date';
import { expandRuleTable } from './expand';
import {
  adjustVerdictBySymptoms,
  computeLayeredBurden,
  matchIngredientInput,
  matchIngredientGroup,
  maxPermittedRemovalPower,
  resolveProduct,
  resolveSunscreenCleansing,
  resolveTarget,
} from './resolve';
import { validateRuleTable } from './validate';

describe('Recovery Note rule table v6', () => {
  it('validates every source timeline and reports review priorities', () => {
    const report = validateRuleTable();
    expect(report.errors).toEqual([]);
    expect(report.needsReview).toContain('sun.waterproof_stick.normal');
    expect(report.needsReview).toContain('ing.brightening_functional.normal');
    expect(report.pendingRemoval).toContain('ing.acne_active.normal');
    expect(report.deferred).toContain('ing.retinoid.high');
  });

  it.each([
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 3],
    [4, 3],
    [5, 4],
    [6, 4],
    [7, 5],
    [8, 5],
    [9, 5],
    [10, 5],
    [11, 5],
    [12, 5],
    [13, 5],
    [14, 5],
  ])('computes D+%i permitted cleansing power as %i', (day, expected) => {
    expect(maxPermittedRemovalPower(day, 'normal')).toBe(expected);
  });

  it.each([
    ['serum_lotion', [], 2],
    ['regular_non_waterproof', [], 3],
    ['regular_non_waterproof', ['cushion'], 5],
    ['regular_non_waterproof', ['cushion', 'powder'], 5],
    ['waterproof_stick', ['foundation', 'concealer'], 5],
  ])('computes layered burden for %s + %j', (sunscreen, makeup, expected) => {
    expect(computeLayeredBurden(sunscreen, makeup)).toBe(expected);
  });

  it('returns both sunscreen-cleansing coupling branches', () => {
    expect(resolveSunscreenCleansing('serum_lotion', [], 0, 'normal')).toMatchObject({
      ok: false,
      required: 2,
      permitted: 1,
    });
    expect(resolveSunscreenCleansing('serum_lotion', [], 1, 'normal')).toMatchObject({
      ok: true,
      required: 2,
    });
  });

  it('clamps high-sensitivity retinoid beyond D+14', () => {
    const retinoid = expandRuleTable().timelines.find(
      (timeline) => timeline.target_id === 'retinoid' && timeline.sensitivity === 'high',
    );
    expect(retinoid).toMatchObject({
      deferred: true,
      true_reopen_d: 16,
      reopen_d_day: null,
    });
    expect(retinoid?.phases.at(-1)).toMatchObject({
      to_d: 14,
      verdict: 'care',
      condition_text: '아주 소량부터 · 이후 병원 상담 권장',
    });
  });

  it('opens waterproof sunscreen at D+8 for normal sensitivity', () => {
    expect(resolveTarget('sunscreen_type', 'waterproof_stick', 7, 'normal').verdict).toBe('stop');
    expect(resolveTarget('sunscreen_type', 'waterproof_stick', 8, 'normal').verdict).toBe('go');
  });

  it('downgrades niacinamide but keeps ceramide restorative', () => {
    const symptoms = [{ id: 'redness', present: true, severity: 3 as const }];
    expect(
      adjustVerdictBySymptoms(
        'go',
        { type: 'ingredient_group', id: 'niacinamide', policy: 'pigment_rail' },
        5,
        symptoms,
      ).verdict,
    ).toBe('care');
    expect(
      adjustVerdictBySymptoms(
        'go',
        { type: 'ingredient_group', id: 'ceramide', policy: 'restorative' },
        5,
        symptoms,
      ).verdict,
    ).toBe('go');
  });

  it('applies a warning lock partially instead of replacing everything with consult', () => {
    const warning = [{ id: 'discharge_pus', present: true }];
    expect(
      adjustVerdictBySymptoms(
        'go',
        { type: 'ingredient_group', id: 'ceramide', policy: 'restorative' },
        5,
        warning,
      ).verdict,
    ).toBe('go');
    expect(
      adjustVerdictBySymptoms(
        'care',
        { type: 'base_makeup', id: 'cushion', policy: 'irritant' },
        5,
        warning,
      ).verdict,
    ).toBe('stop');
  });

  it('combines ingredient and format using the conservative verdict', () => {
    expect(
      resolveProduct(
        {
          productId: 'vit-c-mask',
          productName: '비타민C 마스크',
          ingredientGroupIds: ['vitamin_c'],
          cleansingMethodIds: [],
          baseMakeupIds: [],
          productCategoryId: 'sheet_mask_functional',
        },
        3,
        'normal',
      ).verdict,
    ).toBe('stop');
    expect(
      resolveProduct(
        {
          productId: 'panthenol-mask',
          productName: '판테놀 마스크',
          ingredientGroupIds: ['panthenol'],
          cleansingMethodIds: [],
          baseMakeupIds: [],
          productCategoryId: 'sheet_mask_soothing',
        },
        2,
        'normal',
      ).verdict,
    ).toBe('care');
  });

  it('excludes zinc oxide from the zinc ingredient group', () => {
    expect(matchIngredientGroup('징크피씨에이')).toBe('zinc');
    expect(matchIngredientGroup('징크옥사이드')).toBeNull();
    expect(matchIngredientGroup('Zinc Oxide')).toBeNull();
  });

  it('applies the next-procedure gate conservatively', () => {
    expect(getNextProcedureDay('2026-08-01', '2026-08-15')).toBe(14);
    expect(resolveTarget('ingredient_group', 'retinoid', 11, 'normal', 14)).toMatchObject({
      verdict: 'stop',
      prepGated: true,
      phaseName: 'prep',
      daysToNext: 3,
    });
    expect(resolveTarget('ingredient_group', 'retinoid', 11, 'normal', 28)).toMatchObject({
      verdict: 'care',
      prepGated: false,
      phaseName: 'ramp_up',
    });
  });

  it('expands prep sensitivity without delaying low sensitivity', () => {
    expect(resolveTarget('ingredient_group', 'ceramide', 20, 'normal', 21).verdict).toBe('go');
    expect(resolveTarget('ingredient_group', 'vitamin_c', 20, 'normal', 23).verdict).toBe('stop');
    expect(resolveTarget('ingredient_group', 'vitamin_c', 18, 'high', 23).verdict).toBe('stop');
    expect(
      expandRuleTable()
        .prep_cells.filter((cell) => cell.target_type === 'sunscreen_type')
        .every((cell) => cell.verdict !== 'stop'),
    ).toBe(true);
  });

  it('returns medicine guidance for excluded ingredients', () => {
    expect(matchIngredientInput('벤조일퍼옥사이드')).toEqual({
      groupId: null,
      excluded: true,
      message:
        "연고·의약품은 등록 대상이 아니에요. 병원에서 받은 제품이라면 '병원 제공'으로 등록해 주세요.",
    });
    expect(matchIngredientInput('하이드로퀴논').groupId).toBeNull();
    expect(matchIngredientGroup('하이드로퀴논')).toBeNull();
  });

  const products = [
    { productId: 'vit-c', ingredientGroupIds: ['vitamin_c'], cleansingMethodIds: [] },
    { productId: 'retinol', ingredientGroupIds: ['retinoid'], cleansingMethodIds: [] },
    { productId: 'acid', ingredientGroupIds: ['exfoliating_acid'], cleansingMethodIds: [] },
  ];

  it('derives and exposes only currently usable combination pairs', () => {
    expect(
      activePairs({ day: 11, sensitivity: 'normal', userProducts: products }).map((p) => p.pair_id),
    ).toEqual(['vitamin_c__retinoid']);
    expect(activePairs({ day: 12, sensitivity: 'normal', userProducts: products })).toHaveLength(3);
    expect(
      activePairs({
        day: 11,
        sensitivity: 'normal',
        userProducts: products.filter((product) => product.productId !== 'vit-c'),
      }),
    ).toEqual([]);
  });

  it('hides combinations for warning signals and prep, and drops late pairs', () => {
    expect(
      activePairs({
        day: 12,
        sensitivity: 'normal',
        userProducts: products,
        symptoms: [{ id: 'discharge_pus', present: true }],
      }),
    ).toEqual([]);
    expect(
      activePairs({
        day: 11,
        sensitivity: 'normal',
        userProducts: products,
        nextProcedureDay: 14,
      }),
    ).toEqual([]);
    expect(buildCombinations('normal', 14).map((pair) => pair.pair_id)).not.toContain(
      'vitamin_c__retinoid',
    );
  });

  it('replaces an inseparable same-product pair with a product note', () => {
    const oneProduct = [
      {
        productId: 'combined-serum',
        ingredientGroupIds: ['vitamin_c', 'retinoid'],
        cleansingMethodIds: [],
      },
    ];
    expect(activePairs({ day: 12, sensitivity: 'normal', userProducts: oneProduct })).toEqual([]);
    expect(sameProductCombinationNotes(oneProduct)['combined-serum']).toContain(
      '이 제품 하나만 쓰고 다른 기능성 제품은 오늘 쉬어주세요.',
    );
    expect(
      resolveProduct(
        {
          productId: 'combined-serum',
          productName: '복합 세럼',
          ingredientGroupIds: ['vitamin_c', 'retinoid'],
          cleansingMethodIds: [],
          baseMakeupIds: [],
        },
        12,
        'normal',
      ).notes,
    ).toContain('이 제품 하나만 쓰고 다른 기능성 제품은 오늘 쉬어주세요.');
  });

  it('keeps unknown separate from go and out of symptom downgrade', () => {
    const unknown = resolveProduct(
      {
        productId: 'unknown',
        productName: '성분 미상',
        ingredientGroupIds: [],
        cleansingMethodIds: [],
        baseMakeupIds: [],
      },
      3,
      'normal',
    );
    expect(unknown.verdict).toBe('unknown');
    expect(unknown.primaryText).toContain('안전하다는 뜻이 아니라');
    expect(
      adjustVerdictBySymptoms(
        'unknown',
        { type: 'ingredient_group', id: 'missing', policy: null },
        5,
        [{ id: 'redness', present: true, severity: 3 }],
      ).verdict,
    ).toBe('unknown');
  });

  it('builds the D+11 and D+12 UI combination scenarios by affected product', () => {
    const uiProducts = [
      {
        productId: 'vit-c',
        name: '비타민C 앰플',
        category: 'skincare' as const,
        ingredientGroupIds: ['vitamin_c'],
        cleansingMethodIds: [],
        verdict: 'go' as const,
      },
      {
        productId: 'retinol',
        name: '레티놀 크림',
        category: 'skincare' as const,
        ingredientGroupIds: ['retinoid'],
        cleansingMethodIds: [],
        verdict: 'care' as const,
      },
      {
        productId: 'acid',
        name: '각질 토너',
        category: 'skincare' as const,
        ingredientGroupIds: ['exfoliating_acid'],
        cleansingMethodIds: [],
        verdict: 'stop' as const,
      },
      {
        productId: 'ceramide',
        name: '세라마이드 크림',
        category: 'skincare' as const,
        ingredientGroupIds: ['ceramide'],
        cleansingMethodIds: [],
        verdict: 'go' as const,
      },
    ];
    const day11 = resolveCombinationState({
      day: 11,
      sensitivity: 'normal',
      userProducts: uiProducts,
    });
    expect(day11.cautionPairs.map((pair) => pair.pairId)).toEqual(['vitamin_c__retinoid']);
    expect(day11.affectedProducts.map((product) => product.productId)).toEqual([
      'vit-c',
      'retinol',
    ]);
    expect(day11.isCollapsed).toBe(false);

    const day12 = resolveCombinationState({
      day: 12,
      sensitivity: 'normal',
      userProducts: uiProducts.map((product) =>
        product.productId === 'acid' ? { ...product, verdict: 'care' as const } : product,
      ),
    });
    expect(day12.cautionPairs).toHaveLength(3);
    expect(day12.affectedProducts).toHaveLength(3);
    expect(day12.isCollapsed).toBe(true);
  });

  it('shows ok pairs only without creating a caution strip state', () => {
    const state = resolveCombinationState({
      day: 7,
      sensitivity: 'normal',
      userProducts: [
        {
          productId: 'niacin',
          name: '데일리 토너',
          category: 'skincare',
          ingredientGroupIds: ['niacinamide'],
          cleansingMethodIds: [],
          verdict: 'go',
        },
        {
          productId: 'vit-c',
          name: '비타민C 앰플',
          category: 'skincare',
          ingredientGroupIds: ['vitamin_c'],
          cleansingMethodIds: [],
          verdict: 'care',
        },
        {
          productId: 'retinol',
          name: '레티놀 크림',
          category: 'skincare',
          ingredientGroupIds: ['retinoid'],
          cleansingMethodIds: [],
          verdict: 'stop',
        },
      ],
    });
    expect(state.cautionPairs).toEqual([]);
    expect(state.affectedProducts).toEqual([]);
    expect(state.okPairs.map((pair) => pair.pairId)).toEqual(['niacinamide__vitamin_c']);
  });

  it('filters a cross-category pair by affected products without merging screens', () => {
    const state = resolveCombinationState({
      day: 12,
      sensitivity: 'normal',
      userProducts: [
        {
          productId: 'acid',
          name: '각질 토너',
          category: 'skincare',
          ingredientGroupIds: ['exfoliating_acid'],
          cleansingMethodIds: [],
          verdict: 'care',
        },
        {
          productId: 'scrub',
          name: '스크럽 클렌저',
          category: 'cleansing',
          ingredientGroupIds: [],
          cleansingMethodIds: ['scrub_deep'],
          verdict: 'care',
        },
      ],
      selectedProductId: 'acid',
    });
    expect(combinationsForCategory(state, 'skincare').affectedProducts).toMatchObject([
      { productId: 'acid' },
    ]);
    expect(combinationsForCategory(state, 'cleansing').affectedProducts).toMatchObject([
      { productId: 'scrub' },
    ]);
    expect(combinationsForCategory(state, 'cleansing').selectedProductId).toBe('acid');
  });

  it('hides UI pairs for warning signals and the 14-day prep gate', () => {
    const userProducts = [
      {
        productId: 'vit-c',
        name: '비타민C 앰플',
        category: 'skincare' as const,
        ingredientGroupIds: ['vitamin_c'],
        cleansingMethodIds: [],
        verdict: 'go' as const,
      },
      {
        productId: 'retinol',
        name: '레티놀 크림',
        category: 'skincare' as const,
        ingredientGroupIds: ['retinoid'],
        cleansingMethodIds: [],
        verdict: 'care' as const,
      },
    ];
    expect(
      resolveCombinationState({
        day: 11,
        sensitivity: 'normal',
        userProducts,
        symptoms: [{ id: 'discharge_pus', present: true }],
      }).cautionPairs,
    ).toEqual([]);
    expect(
      resolveCombinationState({
        day: 11,
        sensitivity: 'normal',
        userProducts,
        nextProcedureDay: 14,
      }).cautionPairs,
    ).toEqual([]);
  });
});

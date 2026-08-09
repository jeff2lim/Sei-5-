import { describe, expect, it } from 'vitest';
import { expandRuleTable } from './expand';
import {
  adjustVerdictBySymptoms,
  computeLayeredBurden,
  matchIngredientGroup,
  maxPermittedRemovalPower,
  resolveProduct,
  resolveSunscreenCleansing,
  resolveTarget,
} from './resolve';
import { validateRuleTable } from './validate';

describe('Recovery Note rule table v5', () => {
  it('validates every source timeline and reports review priorities', () => {
    const report = validateRuleTable();
    expect(report.errors).toEqual([]);
    expect(report.needsReview).toContain('sun.waterproof_stick.normal');
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
});

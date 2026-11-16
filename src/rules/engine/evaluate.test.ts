import { describe, expect, it } from 'vitest';
import type { Product } from '@/domain/product';
import type { CheckIn } from '@/domain/check-in';
import { rulePackMeta } from '@/rules/loaders/bundled-rule-pack';
import {
  evaluateAttribute,
  evaluateCategory,
  evaluateCheckIn,
  evaluateProduct,
  symptomsForDay,
} from '@/rules/engine/evaluate';

const product = (attributeIds: string[]): Product => ({
  id: 'product-1',
  name: '테스트 제품',
  category: 'skincare',
  attributeIds,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
});

describe('deterministic rule engine', () => {
  it('rolls product verdict up with stop > care > go', () => {
    const verdict = evaluateProduct(product(['hydrating', 'niacinamide', 'retinoid']), 2);
    expect(verdict.level).toBe('stop');
    expect(verdict.decisiveAttributeId).toBe('retinoid');
  });

  it('uses the latest resume day among equally ranked care rules', () => {
    const verdict = evaluateProduct(product(['niacinamide', 'vitamin-c']), 7);
    expect(verdict.level).toBe('care');
    expect(verdict.resumeDay).toBe(9);
  });

  it('keeps missing attributes unknown instead of treating them as go', () => {
    expect(evaluateAttribute('not-in-pack', 3).level).toBe('unknown');
    expect(evaluateProduct(product([]), 3).level).toBe('unknown');
  });

  it('maps check-in answers directly to the highest priority action', () => {
    const checkIn: CheckIn = {
      id: 'check-1',
      checkedAt: '2026-07-02T00:00:00.000Z',
      answers: [
        { symptomId: 'redness', present: true, severity: 2 },
        { symptomId: 'blister', present: true },
      ],
      rulePackVersion: rulePackMeta.version,
    };
    expect(evaluateCheckIn(checkIn).type).toBe('CONTACT_CLINIC_PROMPTLY');
  });

  it('preserves the rule pack version on every product verdict', () => {
    expect(evaluateProduct(product(['hydrating']), 0).rulePackVersion).toBe('6.0.0');
  });

  it('explains each ingredient itself instead of copying the product-level blocker', () => {
    const verdict = evaluateProduct(product(['hydrating', 'zinc']), 0);
    const ceramide = verdict.details.find((detail) => detail.attributeId === 'ceramide');
    const zinc = verdict.details.find((detail) => detail.attributeId === 'zinc');

    expect(ceramide?.reason).toContain('피부 장벽 강화와 보습');
    expect(ceramide?.reason).not.toContain('징크 때문에');
    expect(zinc?.reason).toContain('따갑거나 건조');
  });

  it('exposes the prep gate through the app-facing evaluator', () => {
    const verdict = evaluateProduct(product(['retinoid']), 11, 'normal', 14);
    expect(verdict.level).toBe('stop');
    expect(verdict.decidingAxis).toBe('prep_gate');
    expect(verdict.prepText).toContain('다음 시술이 3일 남아서');
  });

  describe('category rollup', () => {
    it('reports go when every product in the category is go', () => {
      const category = evaluateCategory('skincare', [product(['hydrating'])], 10);
      expect(category.products[0].level).toBe('go');
      expect(category.level).toBe('go');
    });

    it('stays unknown only when there is nothing to judge', () => {
      expect(evaluateCategory('skincare', [], 10).level).toBe('unknown');
    });
  });

  describe('unknown preservation', () => {
    it('does not let a go ingredient hide an ingredient with no rule', () => {
      const verdict = evaluateProduct(product(['hydrating', 'not-in-pack']), 10);
      expect(verdict.level).toBe('unknown');
      expect(verdict.evaluationStatus).toBe('partial');
      expect(verdict.unknownAttributeIds).toEqual(['not-in-pack']);
    });

    it('keeps a more conservative verdict but still reports the gap', () => {
      const verdict = evaluateProduct(product(['retinoid', 'not-in-pack']), 2);
      expect(verdict.level).toBe('stop');
      expect(verdict.evaluationStatus).toBe('partial');
    });

    it('marks format-only verdicts as partial', () => {
      const verdict = evaluateProduct(product(['gentle-cleanser']), 3);
      expect(verdict.missingInputs).toEqual(['ingredients']);
      expect(verdict.evaluationStatus).toBe('partial');
    });

    it('reports complete when every selected target has a rule', () => {
      const verdict = evaluateProduct(product(['hydrating', 'niacinamide']), 10);
      expect(verdict.evaluationStatus).toBe('complete');
      expect(verdict.unknownAttributeIds).toEqual([]);
    });
  });

  describe('days outside the rule window', () => {
    it('flags days after D+14 instead of silently reusing D+14', () => {
      const atEnd = evaluateProduct(product(['retinoid']), 14);
      const later = evaluateProduct(product(['retinoid']), 60);
      expect(atEnd.dayCoverage).toBe('in_window');
      expect(later.dayCoverage).toBe('after_window');
      expect(later.level).toBe(atEnd.level);
    });

    it('does not apply D+0 rules to a day before the procedure', () => {
      const verdict = evaluateProduct(product(['retinoid']), -3);
      expect(verdict.level).toBe('unknown');
      expect(verdict.dayCoverage).toBe('before_procedure');
    });

    it('reports an invalid day explicitly', () => {
      const verdict = evaluateProduct(product(['retinoid']), Number.NaN);
      expect(verdict.level).toBe('unknown');
      expect(verdict.dayCoverage).toBe('invalid');
    });
  });

  describe('symptom check-in reaches the product verdict', () => {
    const strongRedness = [{ id: 'redness', present: true, severity: 3 as const }];
    const blister = [{ id: 'blister', present: true }];

    it('downgrades one step on a strong recovery symptom', () => {
      const base = evaluateProduct(product(['niacinamide']), 10);
      const adjusted = evaluateProduct(product(['niacinamide']), 10, 'normal', null, strongRedness);
      expect(base.level).toBe('go');
      expect(adjusted.level).toBe('care');
      expect(adjusted.symptomAdjustment).toBe('downgraded_one_step');
      expect(adjusted.details[0].baseLevel).toBe('go');
      expect(adjusted.details[0].reason).toContain('오늘 입력한 반응');
    });

    it('drops the resume day and does not repeat the reason in product notes', () => {
      const base = evaluateProduct(product(['niacinamide']), 10);
      const adjusted = evaluateProduct(product(['niacinamide']), 10, 'normal', null, strongRedness);
      expect(base.resumeDay).toBeDefined();
      expect(adjusted.resumeDay).toBeUndefined();
      expect(adjusted.details[0].resumeDay).toBeUndefined();
      expect(adjusted.notes ?? []).toEqual([]);
    });

    it('locks functional ingredients to stop on a warning symptom', () => {
      const adjusted = evaluateProduct(product(['niacinamide']), 10, 'normal', null, blister);
      expect(adjusted.level).toBe('stop');
      expect(adjusted.symptomAdjustment).toBe('warning_lock');
    });

    it('leaves restorative ingredients alone', () => {
      const adjusted = evaluateProduct(product(['hydrating']), 10, 'normal', null, blister);
      expect(adjusted.level).toBe('go');
      expect(adjusted.symptomAdjustment).toBeNull();
    });

    it('never turns unknown into another verdict', () => {
      const adjusted = evaluateProduct(product(['not-in-pack']), 10, 'normal', null, blister);
      expect(adjusted.level).toBe('unknown');
    });

    it('carries the adjustment into the category rollup', () => {
      const category = evaluateCategory(
        'skincare',
        [product(['niacinamide'])],
        10,
        'normal',
        null,
        strongRedness,
      );
      expect(category.level).toBe('care');
    });

    it('uses the latest check-in recorded on the same procedure day', () => {
      const checkIns: CheckIn[] = [
        {
          id: 'old-day',
          checkedAt: '2026-07-05T09:00:00.000Z',
          procedureDay: 4,
          answers: [{ symptomId: 'blister', present: true }],
          rulePackVersion: rulePackMeta.version,
        },
        {
          id: 'morning',
          checkedAt: '2026-07-06T00:00:00.000Z',
          procedureDay: 5,
          answers: [{ symptomId: 'redness', present: true, severity: 3 }],
          rulePackVersion: rulePackMeta.version,
        },
        {
          id: 'evening',
          checkedAt: '2026-07-06T10:00:00.000Z',
          procedureDay: 5,
          answers: [{ symptomId: 'redness', present: true, severity: 1 }],
          rulePackVersion: rulePackMeta.version,
        },
      ];
      expect(symptomsForDay(checkIns, 5)).toEqual([{ id: 'redness', present: true, severity: 1 }]);
      expect(symptomsForDay(checkIns, 6)).toEqual([]);
      expect(symptomsForDay(undefined, 5)).toEqual([]);
    });
  });
});

import { describe, expect, it } from 'vitest';
import type { Product } from '@/domain/product';
import type { CheckIn } from '@/domain/check-in';
import { bundledRulePack } from '@/rules/loaders/bundled-rule-pack';
import {
  evaluateAttribute,
  evaluateCheckIn,
  evaluateProduct,
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
    const verdict = evaluateProduct(
      product(['hydrating', 'niacinamide', 'retinoid']),
      2,
      bundledRulePack,
    );
    expect(verdict.level).toBe('stop');
    expect(verdict.decisiveAttributeId).toBe('retinoid');
  });

  it('uses the latest resume day among equally ranked care rules', () => {
    const verdict = evaluateProduct(
      product(['niacinamide', 'vitamin-c']),
      1,
      bundledRulePack,
    );
    expect(verdict.level).toBe('care');
    expect(verdict.resumeDay).toBe(5);
  });

  it('keeps missing attributes unknown instead of treating them as go', () => {
    expect(evaluateAttribute('not-in-pack', 3, bundledRulePack).level).toBe('unknown');
    expect(evaluateProduct(product([]), 3, bundledRulePack).level).toBe('unknown');
  });

  it('maps check-in answers directly to the highest priority action', () => {
    const checkIn: CheckIn = {
      id: 'check-1',
      checkedAt: '2026-07-02T00:00:00.000Z',
      answers: [
        { symptomId: 'pain', present: true, severity: 'mild' },
        { symptomId: 'blister', present: true, severity: 'mild' },
      ],
      rulePackVersion: bundledRulePack.meta.version,
    };
    expect(evaluateCheckIn(checkIn, bundledRulePack).type).toBe('CONTACT_CLINIC_PROMPTLY');
  });

  it('preserves the rule pack version on every product verdict', () => {
    expect(evaluateProduct(product(['hydrating']), 0, bundledRulePack).rulePackVersion).toBe(
      bundledRulePack.meta.version,
    );
  });
});

import { describe, expect, it } from 'vitest';
import type { Product } from '@/domain/product';
import type { CheckIn } from '@/domain/check-in';
import { rulePackMeta } from '@/rules/loaders/bundled-rule-pack';
import { evaluateAttribute, evaluateCheckIn, evaluateProduct } from '@/rules/engine/evaluate';

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
});

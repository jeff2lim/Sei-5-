import attributes from '../../rules/attributes.json';
import contactRules from '../../rules/contact-rules.json';
import meta from '../../rules/meta.json';
import verdictRules from '../../rules/verdict-rules.json';
import { describe, expect, it } from 'vitest';
import { validateRuleFiles } from './schema';

const valid = { meta, attributes, verdictRules, contactRules };

describe('rule pack validation', () => {
  it('accepts the bundled fixture', () => {
    expect(validateRuleFiles(valid).meta.version).toBe(meta.version);
  });

  it('rejects an unknown attribute reference', () => {
    expect(() =>
      validateRuleFiles({
        ...valid,
        verdictRules: [
          ...verdictRules,
          {
            attributeId: 'missing',
            periods: [{ fromDay: 0, toDay: null, level: 'go', reason: 'test' }],
          },
        ],
      }),
    ).toThrow('존재하지 않는 attribute');
  });

  it('rejects overlapping date ranges', () => {
    expect(() =>
      validateRuleFiles({
        ...valid,
        verdictRules: [
          {
            attributeId: 'hydrating',
            periods: [
              { fromDay: 0, toDay: 3, level: 'care', reason: 'a' },
              { fromDay: 3, toDay: null, level: 'go', reason: 'b' },
            ],
          },
        ],
      }),
    ).toThrow('날짜 구간이 겹칩니다');
  });

  it('requires reviewer metadata for non-draft packs', () => {
    expect(() =>
      validateRuleFiles({
        ...valid,
        meta: { ...meta, status: 'PILOT' },
      }),
    ).toThrow();
  });
});

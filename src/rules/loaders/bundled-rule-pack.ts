import attributes from '../../../rules/attributes.json';
import contactRules from '../../../rules/contact-rules.json';
import meta from '../../../rules/meta.json';
import verdictRules from '../../../rules/verdict-rules.json';
import type { RulePack } from '@/domain/rule-pack';

export const bundledRulePack = {
  meta,
  attributes,
  verdictRules,
  contactRules,
} as RulePack;

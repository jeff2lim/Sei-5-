import meta from '../../../rules/meta.json';
import type { RulePackMeta } from '@/domain/rule-pack';

/**
 * 화면에 표시할 룰팩 버전·상태입니다.
 * 판정은 src/ruletable이 담당하므로 규칙 JSON 본문은 번들에 포함하지 않습니다.
 * (규칙 JSON은 scripts/validate-rules.ts와 src/rules/schema.test.ts가 검증합니다.)
 */
export const rulePackMeta = meta as RulePackMeta;

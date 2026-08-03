import type { CheckIn, ContactAction } from '@/domain/check-in';
import type { Product, ProductCategory, VerdictLevel } from '@/domain/product';
import type { RulePack } from '@/domain/rule-pack';
import type { AttributeVerdict, CategoryVerdict, ProductVerdict } from '@/domain/verdict';

const rank: Record<VerdictLevel, number> = { unknown: 0, go: 1, care: 2, stop: 3 };

export function evaluateAttribute(
  attributeId: string,
  procedureDay: number,
  rulePack: RulePack,
): AttributeVerdict {
  const rule = rulePack.verdictRules.find((item) => item.attributeId === attributeId);
  if (!rule) {
    return {
      attributeId,
      level: 'unknown',
      reason: '이 속성에 연결된 안내 정보가 아직 없습니다.',
    };
  }

  const period = rule.periods.find(
    (item) =>
      procedureDay >= item.fromDay && (item.toDay === null || procedureDay <= item.toDay),
  );
  if (!period) {
    return {
      attributeId,
      level: 'unknown',
      reason: '현재 날짜에 연결된 안내 정보가 아직 없습니다.',
    };
  }

  return {
    attributeId,
    level: period.level,
    resumeDay: period.resumeDay,
    reason: period.reason,
  };
}

export function evaluateProduct(
  product: Product,
  procedureDay: number,
  rulePack: RulePack,
): ProductVerdict {
  if (product.attributeIds.length === 0) {
    return {
      productId: product.id,
      level: 'unknown',
      details: [],
      rulePackVersion: rulePack.meta.version,
    };
  }

  const details = product.attributeIds.map((attributeId) =>
    evaluateAttribute(attributeId, procedureDay, rulePack),
  );
  const level = details.reduce<VerdictLevel>(
    (current, detail) => (rank[detail.level] > rank[current] ? detail.level : current),
    'unknown',
  );
  const decisive = details
    .filter((detail) => detail.level === level)
    .sort((a, b) => (b.resumeDay ?? -1) - (a.resumeDay ?? -1))[0];

  return {
    productId: product.id,
    level,
    resumeDay:
      level === 'care'
        ? Math.max(...details.filter((detail) => detail.level === 'care').map((d) => d.resumeDay ?? 0))
        : decisive?.resumeDay,
    decisiveAttributeId: decisive?.attributeId,
    details: details.sort((a, b) => rank[b.level] - rank[a.level]),
    rulePackVersion: rulePack.meta.version,
  };
}

export function evaluateProducts(
  products: Product[],
  procedureDay: number,
  rulePack: RulePack,
): ProductVerdict[] {
  return products.map((product) => evaluateProduct(product, procedureDay, rulePack));
}

export function evaluateCategory(
  category: ProductCategory,
  products: Product[],
  procedureDay: number,
  rulePack: RulePack,
): CategoryVerdict {
  const matchingProducts = products.filter((product) => product.category === category);
  const verdicts = evaluateProducts(matchingProducts, procedureDay, rulePack);
  const level = verdicts.reduce<VerdictLevel>(
    (current, verdict) => (rank[verdict.level] > rank[current] ? verdict.level : current),
    'unknown',
  );
  return { category, level, products: verdicts };
}

const actionRank = {
  CONTINUE_GUIDE: 0,
  CONTACT_CLINIC: 1,
  CONTACT_CLINIC_PROMPTLY: 2,
  EMERGENCY_GUIDANCE: 3,
} as const;

export function evaluateCheckIn(checkIn: CheckIn, rulePack: RulePack): ContactAction {
  const matched = rulePack.contactRules
    .filter((rule) => {
      const answer = checkIn.answers.find((item) => item.symptomId === rule.symptomId);
      return (
        answer?.present === true &&
        (!rule.conditions.severity || answer.severity === rule.conditions.severity)
      );
    })
    .sort((a, b) => actionRank[b.action] - actionRank[a.action])[0];

  return matched
    ? { type: matched.action, title: matched.title, body: matched.body }
    : {
        type: 'CONTINUE_GUIDE',
        title: '입력하신 항목에서 별도 연락 안내는 없어요',
        body: '오늘 안내를 이어가세요. 증상이 새로 생기거나 심해지면 시술받은 병원 또는 의료기관에 문의하세요.',
      };
}

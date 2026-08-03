import { z } from 'zod';

const categorySchema = z.enum(['cleansing', 'skincare', 'outing']);
const levelSchema = z.enum(['go', 'care', 'stop']);

export const metaSchema = z
  .object({
    id: z.string().min(1),
    version: z.string().min(1),
    status: z.enum(['DRAFT_NOT_FOR_PATIENTS', 'PILOT', 'APPROVED']),
    source: z.object({
      type: z.enum(['placeholder', 'team_protocol', 'clinic_protocol']),
      title: z.string().min(1),
    }),
    reviewedBy: z.string().min(1).optional(),
    reviewedAt: z.string().datetime().optional(),
  })
  .superRefine((value, context) => {
    if (value.status !== 'DRAFT_NOT_FOR_PATIENTS' && (!value.reviewedBy || !value.reviewedAt)) {
      context.addIssue({
        code: 'custom',
        message: 'PILOT 또는 APPROVED 룰팩에는 검수자와 검수 일시가 필요합니다.',
      });
    }
  });

export const attributesSchema = z.array(
  z.object({
    id: z.string().min(1),
    category: categorySchema,
    name: z.string().min(1),
    description: z.string().min(1),
  }),
);

export const verdictRulesSchema = z.array(
  z.object({
    attributeId: z.string().min(1),
    periods: z
      .array(
        z.object({
          fromDay: z.number().int().min(0),
          toDay: z.number().int().min(0).nullable(),
          level: levelSchema,
          resumeDay: z.number().int().min(0).optional(),
          reason: z.string().min(1),
        }),
      )
      .min(1),
  }),
);

export const contactRulesSchema = z.array(
  z.object({
    symptomId: z.string().min(1),
    conditions: z.object({
      present: z.literal(true),
      severity: z.enum(['mild', 'moderate', 'severe']).optional(),
    }),
    action: z.enum([
      'CONTINUE_GUIDE',
      'CONTACT_CLINIC',
      'CONTACT_CLINIC_PROMPTLY',
      'EMERGENCY_GUIDANCE',
    ]),
    title: z.string().min(1),
    body: z.string().min(1),
  }),
);

export const rulePackSchema = z.object({
  meta: metaSchema,
  attributes: attributesSchema,
  verdictRules: verdictRulesSchema,
  contactRules: contactRulesSchema,
});

export type RuleFiles = z.infer<typeof rulePackSchema>;

export function validateRuleFiles(input: unknown): RuleFiles {
  const parsed = rulePackSchema.parse(input);
  const attributeIds = parsed.attributes.map((attribute) => attribute.id);
  const duplicateAttribute = attributeIds.find(
    (id, index) => attributeIds.indexOf(id) !== index,
  );
  if (duplicateAttribute) throw new Error(`중복 attribute ID: ${duplicateAttribute}`);

  const ruleIds = parsed.verdictRules.map((rule) => rule.attributeId);
  const duplicateRule = ruleIds.find((id, index) => ruleIds.indexOf(id) !== index);
  if (duplicateRule) throw new Error(`중복 verdict rule ID: ${duplicateRule}`);

  for (const rule of parsed.verdictRules) {
    if (!attributeIds.includes(rule.attributeId)) {
      throw new Error(`존재하지 않는 attribute 참조: ${rule.attributeId}`);
    }

    const sorted = [...rule.periods].sort((a, b) => a.fromDay - b.fromDay);
    for (let index = 0; index < sorted.length; index += 1) {
      const current = sorted[index];
      if (current.toDay !== null && current.toDay < current.fromDay) {
        throw new Error(`${rule.attributeId}: 날짜 구간이 역전되었습니다.`);
      }
      const previous = sorted[index - 1];
      if (previous) {
        if (previous.toDay === null || current.fromDay <= previous.toDay) {
          throw new Error(`${rule.attributeId}: 날짜 구간이 겹칩니다.`);
        }
        if (current.fromDay !== previous.toDay + 1) {
          throw new Error(`${rule.attributeId}: 날짜 구간이 연속되지 않습니다.`);
        }
      }
    }
  }

  return parsed;
}

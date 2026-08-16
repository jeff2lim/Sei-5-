/**
 * 화면에 노출하는 룰팩 메타입니다.
 * 규칙 본문의 형태는 src/rules/schema.ts의 zod 스키마가 정의합니다.
 */
export type RulePackMeta = {
  id: string;
  version: string;
  status: 'DRAFT_NOT_FOR_PATIENTS' | 'PILOT' | 'APPROVED';
  source: {
    type: 'placeholder' | 'team_protocol' | 'clinic_protocol';
    title: string;
  };
  reviewedBy?: string;
  reviewedAt?: string;
};

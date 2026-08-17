import { rulePackMeta } from '@/rules/loaders/bundled-rule-pack';

export function DraftBanner() {
  if (rulePackMeta.status !== 'DRAFT_NOT_FOR_PATIENTS') return null;
  return (
    <div className="draft-banner" role="status">
      내부 검증 중인 안내입니다. 실제 환자 안내용으로 검수되지 않았습니다.
    </div>
  );
}

'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { LoadingScreen } from '@/components/common/loading-screen';
import { evaluateCheckIn } from '@/rules/engine/evaluate';
import { bundledRulePack } from '@/rules/loaders/bundled-rule-pack';
import { useRecoveryStore } from '@/store/recovery-store';
import { AlertTriangle, CheckCircle2, PhoneCall } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const symptomLabels: Record<string, string> = {
  redness: '붉음',
  swelling: '붓기',
  blister: '수포',
  pain: '통증',
  heat: '열감',
};

const severityLabels = {
  mild: '가벼움',
  moderate: '중간',
  severe: '심함',
};

function CheckInResultPageContent() {
  const searchParams = useSearchParams();
  const hydrated = useRecoveryStore((state) => state.hydrated);
  const session = useRecoveryStore((state) => state.session);
  const checkIns = session?.checkIns ?? [];
  if (!hydrated) return <LoadingScreen navigation={false} />;
  const checkInId = searchParams.get('id');

  const checkIn = checkInId ? checkIns.find((item) => item.id === checkInId) : checkIns.at(-1);
  if (!checkIn) {
    return (
      <AppShell navigation={false}>
        <div className="empty-state">
          <h2>체크 기록이 없어요</h2>
          <p>오늘 피부 상태를 먼저 입력해 주세요.</p>
          <Link className="button" href="/check-in">
            상태 체크
          </Link>
        </div>
      </AppShell>
    );
  }

  const action = evaluateCheckIn(checkIn, bundledRulePack);
  const urgent = action.type !== 'CONTINUE_GUIDE';
  const Icon = urgent ? AlertTriangle : CheckCircle2;
  const level = action.type === 'CONTACT_CLINIC_PROMPTLY' ? 'stop' : urgent ? 'care' : 'go';

  return (
    <AppShell navigation={false}>
      <p className="eyebrow">Check-in result</p>
      <div className={`verdict-panel ${level}`} role="status" aria-live="polite">
        <Icon size={30} aria-hidden="true" />
        <h2>{action.title}</h2>
        <p>{action.body}</p>
      </div>
      <section className="section card">
        <h2 className="section-title">오늘 입력</h2>
        {checkIn.answers
          .filter((answer) => answer.present)
          .map((answer) => (
            <div className="list-row" key={answer.symptomId}>
              <span>{symptomLabels[answer.symptomId] ?? '선택 항목'}</span>
              <span className="badge care">
                {answer.severity ? severityLabels[answer.severity] : '선택됨'}
              </span>
            </div>
          ))}
        {checkIn.answers.every((answer) => !answer.present) ? (
          <p className="subcopy">선택한 변화가 없습니다.</p>
        ) : null}
      </section>
      {urgent ? (
        <div className="notice section">
          <PhoneCall size={18} aria-hidden="true" />
          <span>이 결과는 위험도 점수나 진단이 아닙니다. 룰팩에 연결된 행동 안내입니다.</span>
        </div>
      ) : null}
      <div className="sticky-actions">
        <Link className="button full" href="/home">
          홈으로 이동
        </Link>
      </div>
    </AppShell>
  );
}

export default function CheckInResultPage() {
  return (
    <Suspense fallback={<LoadingScreen navigation={false} />}>
      <CheckInResultPageContent />
    </Suspense>
  );
}

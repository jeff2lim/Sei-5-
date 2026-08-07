'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { LoadingScreen } from '@/components/common/loading-screen';
import { evaluateCheckIn } from '@/rules/engine/evaluate';
import { bundledRulePack } from '@/rules/loaders/bundled-rule-pack';
import { consecutiveDowngradeDays, hasDowngradeTrigger } from '@/ruletable/resolve';
import { useRecoveryStore } from '@/store/recovery-store';
import { AlertTriangle, CheckCircle2, PhoneCall } from 'lucide-react';
import Link from 'next/link';

const symptomLabels: Record<string, string> = {
  redness: '붉은기',
  heat: '열감',
  stinging: '따가움',
  dryness: '건조·각질',
  breakout: '트러블',
  discharge_pus: '진물·고름',
  blister: '수포·물집',
  worsening_pain: '통증이 심해짐',
  hypopigmentation: '색이 하얗게 빠짐',
};

const severityLabels = {
  1: '약간',
  2: '보통',
  3: '심함',
};

export default function CheckInResultPage() {
  const hydrated = useRecoveryStore((state) => state.hydrated);
  const session = useRecoveryStore((state) => state.session);
  const saveProfile = useRecoveryStore((state) => state.saveProfile);
  const checkIns = session?.checkIns ?? [];
  if (!hydrated) return <LoadingScreen navigation={false} />;
  const checkIn = checkIns.at(-1);
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
  const consecutiveDays = consecutiveDowngradeDays(
    checkIns.map((entry) => ({
      date: entry.checkedAt.slice(0, 10),
      downgraded: hasDowngradeTrigger(
        entry.procedureDay ?? 0,
        entry.answers.map((answer) => ({
          id: answer.symptomId,
          present: answer.present,
          severity: answer.severity,
        })),
      ),
    })),
  );

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
      {consecutiveDays >= 3 && session?.profile.sensitivity !== 'high' ? (
        <section className="section card">
          <h2 className="section-title">3일째 반응이 있으시네요</h2>
          <p className="subcopy">
            민감도를 ‘높음’으로 바꾸면 앞으로 더 여유 있게 안내합니다. 일부 항목이 다시 ‘주의’로
            바뀔 수 있어요.
          </p>
          <div className="segmented" style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() =>
                session ? saveProfile({ ...session.profile, sensitivity: 'high' }) : undefined
              }
            >
              바꾸기
            </button>
            <Link href="/home">그대로 둘게요</Link>
          </div>
        </section>
      ) : null}
      <div className="sticky-actions">
        <Link className="button full" href="/home">
          홈으로 이동
        </Link>
      </div>
    </AppShell>
  );
}

'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { LoadingScreen } from '@/components/common/loading-screen';
import { analytics } from '@/domain/analytics';
import { getProcedureDay } from '@/domain/procedure';
import { bundledRulePack } from '@/rules/loaders/bundled-rule-pack';
import { useRecoveryStore } from '@/store/recovery-store';
import { Check, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CompletePage() {
  const router = useRouter();
  const hydrated = useRecoveryStore((state) => state.hydrated);
  const session = useRecoveryStore((state) => state.session);
  const completeOnboarding = useRecoveryStore((state) => state.completeOnboarding);
  const [completing, setCompleting] = useState(false);
  if (!hydrated) return <LoadingScreen navigation={false} />;

  const day = session?.procedure ? getProcedureDay(session.procedure.performedAt, new Date()) : 0;

  async function startRecovery() {
    if (completing) return;
    setCompleting(true);
    await completeOnboarding();
    analytics.track({
      name: 'onboarding_completed',
      productCount: session?.products.length ?? 0,
    });
    router.push('/home');
  }

  return (
    <AppShell navigation={false}>
      <div className="progress" aria-label="4단계 중 4단계">
        <span className="done" />
        <span className="done" />
        <span className="done" />
        <span className="active" />
      </div>
      <div className="hero-card">
        <div className="hero-mark">
          <Check aria-hidden="true" />
        </div>
        <p className="eyebrow">Ready</p>
        <h1 className="display">회복 관리 준비가 끝났어요.</h1>
        <p className="subcopy">
          오늘은 D+{day}. 등록 제품 {session?.products.length ?? 0}개를 기준으로 안내해요.
        </p>
      </div>
      <section className="section card">
        <div className="list-row">
          <span>시술</span>
          <strong>피코토닝</strong>
        </div>
        <div className="list-row">
          <span>룰팩 버전</span>
          <strong>{bundledRulePack.meta.version}</strong>
        </div>
        <div className="list-row">
          <span>안내 출처</span>
          <strong>샘플 fixture</strong>
        </div>
      </section>
      <div className="sticky-actions">
        <button
          type="button"
          className="button full"
          disabled={completing}
          onClick={() => void startRecovery()}
        >
          <Sparkles size={18} aria-hidden="true" /> {completing ? '저장 중...' : '회복 관리 시작'}
        </button>
      </div>
    </AppShell>
  );
}

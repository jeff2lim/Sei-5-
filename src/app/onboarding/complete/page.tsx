'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { LoadingScreen } from '@/components/common/loading-screen';
import { analytics } from '@/domain/analytics';
import { getProcedureDay } from '@/domain/procedure';
import { isAuthEnabled } from '@/lib/supabase/config';
import { useRecoveryStore } from '@/store/recovery-store';
import { Check, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CompletePage() {
  const router = useRouter();
  const hydrated = useRecoveryStore((state) => state.hydrated);
  const session = useRecoveryStore((state) => state.session);
  const completeOnboarding = useRecoveryStore((state) => state.completeOnboarding);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthEnabled()) {
      analytics.track({ name: 'auth_prompt_viewed', placement: 'onboarding_complete' });
    }
  }, []);

  if (!hydrated) return <LoadingScreen navigation={false} />;

  const day = session?.procedure ? getProcedureDay(session.procedure.performedAt, new Date()) : 0;

  async function startRecovery(destination: string) {
    if (completing) return;
    setCompleting(true);
    setCompleteError(null);
    try {
      await completeOnboarding();
      analytics.track({
        name: 'onboarding_completed',
        productCount: session?.products.length ?? 0,
      });
      router.push(destination);
    } catch (error) {
      console.error(error);
      setCompleteError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setCompleting(false);
    }
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
      </section>
      <div className="sticky-actions">
        {completeError ? (
          <p className="error" role="alert">
            {completeError}
          </p>
        ) : null}
        {isAuthEnabled() ? (
          <>
            <button
              type="button"
              className="button kakao full"
              disabled={completing}
              onClick={() =>
                void startRecovery('/auth/login?next=/home&placement=onboarding_complete')
              }
            >
              <Sparkles size={18} aria-hidden="true" />
              {completing ? '저장 중...' : '카카오로 기록 저장하기'}
            </button>
            <button
              type="button"
              className="button secondary full"
              disabled={completing}
              onClick={() => {
                analytics.track({
                  name: 'auth_prompt_skipped',
                  placement: 'onboarding_complete',
                });
                void startRecovery('/home');
              }}
            >
              이 기기에서만 계속하기
            </button>
          </>
        ) : (
          <button
            type="button"
            className="button full"
            disabled={completing}
            onClick={() => void startRecovery('/home')}
          >
            <Sparkles size={18} aria-hidden="true" />
            {completing ? '저장 중...' : '회복 관리 시작'}
          </button>
        )}
      </div>
    </AppShell>
  );
}

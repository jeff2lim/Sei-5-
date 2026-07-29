'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { LoadingScreen } from '@/components/common/loading-screen';
import { useRecoveryStore } from '@/store/recovery-store';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const hydrated = useRecoveryStore((state) => state.hydrated);
  const session = useRecoveryStore((state) => state.session);

  useEffect(() => {
    if (!hydrated || !session?.consent) return;
    router.replace(session.procedure ? '/home' : '/onboarding/procedure');
  }, [hydrated, router, session]);

  if (!hydrated || session?.consent) return <LoadingScreen navigation={false} />;

  return (
    <AppShell navigation={false}>
      <div className="hero-card">
        <div className="hero-mark">
          <Sparkles aria-hidden="true" />
        </div>
        <p className="eyebrow">Recovery note</p>
        <h1 className="display">회복하는 오늘을, 내 제품과 함께 기록해요.</h1>
        <p className="subcopy">
          피코토닝 후 날짜와 제품 속성을 기준으로 오늘의 사용 안내를 확인할 수 있어요.
        </p>
      </div>

      <section className="section stack" aria-label="서비스 안내">
        <div className="notice">
          <ShieldCheck aria-hidden="true" size={20} />
          <span>
            이 앱은 진단이나 치료를 제공하지 않으며 의료진의 판단을 대신하지 않습니다. 현재
            룰팩은 내부 검증용입니다.
          </span>
        </div>
        <Link className="button full" href="/consent">
          시작하기 <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>
    </AppShell>
  );
}

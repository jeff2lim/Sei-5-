'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { LoadingScreen } from '@/components/common/loading-screen';
import { Topbar } from '@/components/common/topbar';
import { analytics } from '@/domain/analytics';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { isAuthEnabled } from '@/lib/supabase/config';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function safeNext(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/home';
}

function LoginContent() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const placement = searchParams.get('placement') ?? 'unknown';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithKakao() {
    if (!isAuthEnabled() || loading) return;
    setLoading(true);
    setError(null);
    analytics.track({ name: 'kakao_login_started', placement });

    const importPath = `/auth/import?next=${encodeURIComponent(next)}`;
    const callbackUrl = new URL('/auth/callback', window.location.origin);
    callbackUrl.searchParams.set('next', importPath);

    const { error: signInError } = await createBrowserSupabaseClient().auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (signInError) {
      setLoading(false);
      setError('카카오 로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }

  return (
    <AppShell navigation={false}>
      <Topbar title="기록 저장" closeHref={next} />
      <p className="eyebrow">Keep your record</p>
      <h1 className="headline">카카오로 기록을 안전하게 이어보세요.</h1>
      <p className="subcopy">
        다른 기기에서도 같은 기록을 불러올 수 있어요. 동의 없이 카카오 친구나 메시지에는 접근하지
        않아요.
      </p>

      <section className="section stack">
        <div className="notice">
          <ShieldCheck size={20} aria-hidden="true" />
          <span>현재 브라우저에 저장된 기록은 로그인 성공 후 계정으로 옮겨집니다.</span>
        </div>

        {isAuthEnabled() ? (
          <button
            className="button kakao full"
            type="button"
            disabled={loading}
            onClick={() => void signInWithKakao()}
          >
            {loading ? '카카오로 이동 중...' : '카카오로 3초 만에 저장'}
          </button>
        ) : (
          <div className="notice" role="status">
            <span>로그인 설정을 준비 중이에요. 지금은 이 기기에 계속 저장됩니다.</span>
          </div>
        )}

        <Link
          className="button secondary full"
          href={next}
          onClick={() => analytics.track({ name: 'auth_prompt_skipped', placement })}
        >
          이 기기에서만 계속하기
        </Link>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </AppShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingScreen navigation={false} />}>
      <LoginContent />
    </Suspense>
  );
}

'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { isAuthEnabled } from '@/lib/supabase/config';
import type { User } from '@supabase/supabase-js';
import { Cloud, LogOut, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

function userLabel(user: User) {
  const nickname = user.user_metadata?.name ?? user.user_metadata?.full_name;
  return typeof nickname === 'string' && nickname ? nickname : (user.email ?? '카카오 계정');
}

export function AuthStatusCard() {
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(!isAuthEnabled());

  useEffect(() => {
    if (!isAuthEnabled()) return;
    const supabase = createBrowserSupabaseClient();

    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoaded(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoaded(true);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  if (!loaded) {
    return <div className="card skeleton" aria-label="로그인 상태 확인 중" />;
  }

  if (!user) {
    return (
      <section className="section card stack">
        <div className="list-row" style={{ paddingTop: 0 }}>
          <Smartphone size={19} color="var(--ink-soft)" aria-hidden="true" />
          <span className="list-row-main" style={{ flex: 1 }}>
            <strong>이 기기에만 저장 중</strong>
            <span>카카오를 연결하면 다른 기기에서도 이어볼 수 있어요.</span>
          </span>
          <span className="badge">local</span>
        </div>
        {isAuthEnabled() ? (
          <Link className="button kakao full" href="/auth/login?next=/profile&placement=profile">
            카카오로 기록 저장하기
          </Link>
        ) : null}
      </section>
    );
  }

  return (
    <section className="section card stack">
      <div className="list-row" style={{ paddingTop: 0 }}>
        <Cloud size={19} color="var(--teal)" aria-hidden="true" />
        <span className="list-row-main" style={{ flex: 1 }}>
          <strong>{userLabel(user)}</strong>
          <span>계정에 기록을 저장하고 있어요.</span>
        </span>
        <span className="badge go">cloud</span>
      </div>
      <form action="/auth/signout" method="post">
        <button className="button secondary full" type="submit">
          <LogOut size={17} aria-hidden="true" /> 로그아웃
        </button>
      </form>
      <button
        className="button danger full"
        type="button"
        onClick={() => deleteDialogRef.current?.showModal()}
      >
        계정과 클라우드 기록 삭제
      </button>
      <dialog ref={deleteDialogRef}>
        <div className="stack">
          <div>
            <h2>계정을 삭제할까요?</h2>
            <p className="subcopy">
              카카오 연결과 계정에 저장된 시술, 제품, 체크 기록을 모두 삭제합니다. 되돌릴 수 없어요.
            </p>
          </div>
          <form action="/auth/delete-account" method="post">
            <button className="button danger full" type="submit">
              계정 영구 삭제
            </button>
          </form>
          <button
            className="button secondary full"
            type="button"
            onClick={() => deleteDialogRef.current?.close()}
          >
            취소
          </button>
        </div>
      </dialog>
    </section>
  );
}

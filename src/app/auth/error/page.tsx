import { AppShell } from '@/components/app-shell/app-shell';
import { CircleAlert } from 'lucide-react';
import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <AppShell navigation={false}>
      <div className="empty-state">
        <CircleAlert size={32} aria-hidden="true" />
        <h1 className="headline">로그인을 완료하지 못했어요.</h1>
        <p>취소했거나 인증 시간이 만료됐을 수 있어요. 기존 기기 기록은 그대로 남아 있습니다.</p>
      </div>
      <section className="section stack">
        <Link className="button full" href="/auth/login?next=/home&placement=auth_error">
          다시 시도하기
        </Link>
        <Link className="button secondary full" href="/home">
          이 기기에서 계속하기
        </Link>
      </section>
    </AppShell>
  );
}

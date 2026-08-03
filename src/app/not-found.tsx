import { AppShell } from '@/components/app-shell/app-shell';
import { FileQuestion } from 'lucide-react';
import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <AppShell navigation={false}>
      <div className="empty-state">
        <FileQuestion size={32} aria-hidden="true" />
        <h2>페이지를 찾을 수 없어요</h2>
        <p>주소가 바뀌었거나 더 이상 제공되지 않는 화면이에요.</p>
        <Link className="button" href="/home">
          홈으로 이동
        </Link>
      </div>
    </AppShell>
  );
}

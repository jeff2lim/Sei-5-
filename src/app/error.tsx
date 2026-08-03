'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { AlertTriangle } from 'lucide-react';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <AppShell navigation={false}>
      <div className="empty-state" role="alert">
        <AlertTriangle size={32} aria-hidden="true" />
        <h2>화면을 불러오지 못했어요</h2>
        <p>입력한 정보는 이 브라우저에 그대로 있어요. 잠시 후 다시 시도해 주세요.</p>
        <button className="button" type="button" onClick={reset}>
          다시 시도
        </button>
      </div>
    </AppShell>
  );
}

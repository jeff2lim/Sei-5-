'use client';

import { ChevronLeft, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function Topbar({
  title,
  closeHref,
}: {
  title: string;
  closeHref?: string;
}) {
  const router = useRouter();
  return (
    <header className="topbar">
      <button
        className="icon-button"
        type="button"
        aria-label={closeHref ? '닫기' : '뒤로 가기'}
        onClick={() => (closeHref ? router.push(closeHref) : router.back())}
      >
        {closeHref ? <X aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
      </button>
      <h1 className="topbar-title">{title}</h1>
      <span />
    </header>
  );
}

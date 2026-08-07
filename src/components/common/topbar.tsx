'use client';

import { ChevronLeft, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function Topbar({
  title,
  closeHref,
  backHref,
  onClose,
}: {
  title: string;
  closeHref?: string;
  backHref?: string;
  onClose?: () => void;
}) {
  const router = useRouter();
  function navigateBack() {
    if (closeHref) {
      onClose?.();
      router.push(closeHref);
      return;
    }

    if (backHref) {
      router.push(backHref);
      return;
    }

    router.back();
  }
  return (
    <header className="topbar">
      <button
        className="icon-button"
        type="button"
        aria-label={closeHref ? '닫기' : '뒤로 가기'}
        onClick={navigateBack}
      >
        {closeHref ? <X aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
      </button>
      <h1 className="topbar-title">{title}</h1>
      <span />
    </header>
  );
}

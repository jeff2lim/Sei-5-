'use client';

import type { CombinationState } from '@/ruletable/types';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { CombinationGroup } from './combination-group';

export function CombinationSheet({
  open,
  state,
  day,
  onClose,
  onPick,
  returnFocusRef,
}: {
  open: boolean;
  state: CombinationState;
  day: number;
  onClose: () => void;
  onPick: (productId: string) => void;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const pointerStart = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    titleRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        requestAnimationFrame(() => returnFocusRef.current?.focus());
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, open, returnFocusRef]);

  if (!open) return null;
  const closeAndRestoreFocus = () => {
    onClose();
    requestAnimationFrame(() => returnFocusRef.current?.focus());
  };
  return (
    <div className="combination-sheet-layer">
      <button
        type="button"
        className="combination-scrim"
        aria-label="함께 쓸 때 안내 닫기"
        onClick={closeAndRestoreFocus}
      />
      <section
        className="combination-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="combination-sheet-title"
        onPointerDown={(event) => {
          pointerStart.current = event.clientY;
        }}
        onPointerUp={(event) => {
          if (pointerStart.current !== null && event.clientY - pointerStart.current > 80) {
            closeAndRestoreFocus();
          }
          pointerStart.current = null;
        }}
      >
        <div className="combination-sheet-grab" aria-hidden="true" />
        <div className="combination-sheet-head">
          <h2 id="combination-sheet-title" tabIndex={-1} ref={titleRef}>
            함께 쓸 때
          </h2>
          <p>오늘 확인할 제품 {state.affectedProducts.length}개 · 이 중 하나만 골라 주세요</p>
        </div>
        <div className="combination-sheet-body">
          <CombinationGroup variant="sheet" state={state} day={day} onPick={onPick} />
          <Link className="combination-deep-link" href="/products?tab=ingredient#combination">
            성분별로 전부 보기 ›
          </Link>
        </div>
      </section>
    </div>
  );
}

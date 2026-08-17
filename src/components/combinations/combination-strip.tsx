'use client';

import type { CombinationState } from '@/ruletable/types';
import { ChevronRight } from 'lucide-react';
import { forwardRef } from 'react';

export const CombinationStrip = forwardRef<
  HTMLButtonElement,
  { state: CombinationState; onOpen: () => void }
>(function CombinationStrip({ state, onOpen }, ref) {
  if (!state.cautionPairs.length) return null;
  const selected = state.cautionPairs
    .flatMap((pair) => pair.products)
    .find((product) => product.productId === state.selectedProductId);
  return (
    <button className="combination-strip" type="button" onClick={onOpen} ref={ref}>
      <span className="combination-strip-copy">
        {selected ? (
          <>
            오늘은 <strong title={selected.name}>{selected.name}</strong>을 고르셨어요
          </>
        ) : (
          <>
            오늘 <strong>함께 쓸 때 확인할 제품</strong>이 있어요
          </>
        )}
      </span>
      <span className="combination-strip-end">
        {!selected ? (
          <span className="combination-count">{state.affectedProducts.length}</span>
        ) : null}
        <ChevronRight size={18} aria-hidden="true" />
      </span>
    </button>
  );
});

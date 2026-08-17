'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export function useCombinationPick(procedureId: string | undefined, dayIndex: number) {
  const storageKey = useMemo(
    () => (procedureId ? `combination_pick:${procedureId}:${dayIndex}` : null),
    [dayIndex, procedureId],
  );
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedProductId(storageKey ? window.localStorage.getItem(storageKey) : null);
  }, [storageKey]);

  const selectProduct = useCallback(
    (productId: string) => {
      setSelectedProductId(productId);
      if (storageKey) window.localStorage.setItem(storageKey, productId);
    },
    [storageKey],
  );

  return { selectedProductId, selectProduct };
}

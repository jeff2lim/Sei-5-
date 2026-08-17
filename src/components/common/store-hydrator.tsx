'use client';

import { useRecoveryStore } from '@/store/recovery-store';
import { useEffect } from 'react';

export function StoreHydrator() {
  const hydrate = useRecoveryStore((state) => state.hydrate);
  useEffect(() => {
    void hydrate().catch(() => undefined);
  }, [hydrate]);
  return null;
}

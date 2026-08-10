'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { LoadingScreen } from '@/components/common/loading-screen';
import { analytics } from '@/domain/analytics';
import type { RecoverySession } from '@/domain/session';
import {
  discardLocalSession,
  importLocalSessionToCloud,
  inspectSessionTransfer,
} from '@/repositories/session-transfer';
import { useRecoveryStore } from '@/store/recovery-store';
import { Cloud, Smartphone } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function safeNext(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/home';
}

function sessionSummary(session: RecoverySession | null) {
  if (!session) return '저장된 기록 없음';
  return `${session.procedure?.performedAt ?? '시술일 미등록'} · 제품 ${session.products.length}개 · 체크 ${session.checkIns.length}개`;
}

function ImportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const hydrate = useRecoveryStore((state) => state.hydrate);
  const [conflict, setConflict] = useState<{
    local: RecoverySession;
    cloud: RecoverySession;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(true);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let active = true;

    async function transfer() {
      try {
        const inspection = await inspectSessionTransfer();
        if (!active) return;

        if (inspection.status === 'conflict' && inspection.local && inspection.cloud) {
          setConflict({ local: inspection.local, cloud: inspection.cloud });
          setWorking(false);
          return;
        }

        if (inspection.status === 'ready' && inspection.local) {
          await importLocalSessionToCloud(inspection.local);
          analytics.track({ name: 'local_data_imported' });
        } else if (inspection.status === 'identical') {
          await discardLocalSession();
        }

        await hydrate();
        router.replace(next);
      } catch {
        if (!active) return;
        analytics.track({ name: 'local_data_import_failed' });
        setError('기록을 계정으로 옮기지 못했어요. 로컬 기록은 삭제되지 않았습니다.');
        setWorking(false);
      }
    }

    void transfer();
    return () => {
      active = false;
    };
  }, [hydrate, next, retryNonce, router]);

  async function chooseLocal() {
    if (!conflict || working) return;
    setWorking(true);
    setError(null);
    try {
      await importLocalSessionToCloud(conflict.local);
      analytics.track({ name: 'local_data_imported' });
      await hydrate();
      router.replace(next);
    } catch {
      analytics.track({ name: 'local_data_import_failed' });
      setError('이 기기 기록을 저장하지 못했어요. 다시 시도해 주세요.');
      setWorking(false);
    }
  }

  async function chooseCloud() {
    if (!conflict || working) return;
    setWorking(true);
    setError(null);
    try {
      await discardLocalSession();
      await hydrate();
      router.replace(next);
    } catch {
      setError('계정 기록을 불러오지 못했어요. 다시 시도해 주세요.');
      setWorking(false);
    }
  }

  if (working && !conflict) return <LoadingScreen navigation={false} />;

  return (
    <AppShell navigation={false}>
      <p className="eyebrow">Choose your record</p>
      <h1 className="headline">어느 기록을 이어갈까요?</h1>
      <p className="subcopy">두 기록을 자동으로 덮어쓰지 않았어요. 사용할 기록을 선택해 주세요.</p>

      {conflict ? (
        <section className="section stack">
          <button
            className="choice-card-button"
            type="button"
            disabled={working}
            onClick={() => void chooseCloud()}
          >
            <Cloud size={22} aria-hidden="true" />
            <span>
              <strong>계정에 저장된 기록</strong>
              <small>{sessionSummary(conflict.cloud)}</small>
            </span>
          </button>
          <button
            className="choice-card-button"
            type="button"
            disabled={working}
            onClick={() => void chooseLocal()}
          >
            <Smartphone size={22} aria-hidden="true" />
            <span>
              <strong>이 기기의 기록</strong>
              <small>{sessionSummary(conflict.local)}</small>
            </span>
          </button>
          <div className="notice">
            <span>
              선택하지 않은 기록은 계정에 반영되지 않습니다. 자동 병합 기능은 추후 제공할
              예정이에요.
            </span>
          </div>
        </section>
      ) : null}

      {error && !conflict ? (
        <section className="section">
          <p className="error" role="alert">
            {error}
          </p>
          <button
            className="button secondary full"
            type="button"
            onClick={() => {
              setError(null);
              setWorking(true);
              setRetryNonce((value) => value + 1);
            }}
          >
            다시 시도
          </button>
        </section>
      ) : null}

      {error && conflict ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </AppShell>
  );
}

export default function ImportPage() {
  return (
    <Suspense fallback={<LoadingScreen navigation={false} />}>
      <ImportContent />
    </Suspense>
  );
}

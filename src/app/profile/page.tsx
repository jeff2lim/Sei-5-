'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { LoadingScreen } from '@/components/common/loading-screen';
import { AuthStatusCard } from '@/components/auth/auth-status-card';
import { useRecoveryStore } from '@/store/recovery-store';
import { bundledRulePack } from '@/rules/loaders/bundled-rule-pack';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Download,
  FileText,
  Package,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

export default function ProfilePage() {
  const router = useRouter();
  const hydrated = useRecoveryStore((state) => state.hydrated);
  const hydrationError = useRecoveryStore((state) => state.hydrationError);
  const session = useRecoveryStore((state) => state.session);
  const exportData = useRecoveryStore((state) => state.exportData);
  const deleteAllData = useRecoveryStore((state) => state.deleteAllData);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  if (!hydrated) return <LoadingScreen />;

  async function downloadData() {
    const content = await exportData();
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `recovery-note-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function openDeleteDialog() {
    setDeleteError(null);
    deleteDialogRef.current?.showModal();
  }

  function closeDeleteDialog() {
    if (deleting) return;
    deleteDialogRef.current?.close();
    setDeleteError(null);
  }

  async function clearData() {
    if (deleting) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteAllData();
      deleteDialogRef.current?.close();
      router.replace('/');
    } catch {
      setDeleting(false);
      setDeleteError('전체 데이터를 삭제하지 못했어요. 다시 시도해 주세요.');
    }
  }

  const menu = [
    {
      href: '/products',
      label: '등록 제품',
      value: `${session?.products.length ?? 0}개`,
      icon: Package,
    },
    {
      href: '/records',
      label: '시술 정보',
      value: session?.procedure?.performedAt ?? '미등록',
      icon: CalendarDays,
    },
    { href: '/consent?mode=edit', label: '동의 내역', value: '확인·변경', icon: ShieldCheck },
    { href: '/legal/privacy', label: '개인정보처리방침', value: '', icon: FileText },
    { href: '/legal/terms', label: '서비스 이용약관', value: '', icon: FileText },
  ];

  return (
    <AppShell>
      <p className="eyebrow">Profile & settings</p>
      <h1 className="headline">마이</h1>
      <p className="subcopy">내 정보, 시술 기록과 데이터 설정을 관리해요.</p>

      {hydrationError ? (
        <div className="notice" role="alert">
          <span>계정 기록을 불러오지 못했어요. 오류 코드: {hydrationError}</span>
        </div>
      ) : null}

      <AuthStatusCard />

      <section className="section card">
        {menu.map(({ href, label, value, icon: Icon }) => (
          <Link className="list-row" href={href} key={label}>
            <Icon size={19} color="var(--teal)" aria-hidden="true" />
            <span className="list-row-main" style={{ flex: 1 }}>
              <strong>{label}</strong>
              {value ? <span>{value}</span> : null}
            </span>
            <ChevronRight size={17} aria-hidden="true" />
          </Link>
        ))}
      </section>

      <section className="section card">
        <div className="list-row" style={{ paddingTop: 0 }}>
          <Bell size={19} color="var(--ink-soft)" aria-hidden="true" />
          <span className="list-row-main" style={{ flex: 1 }}>
            <strong>알림 설정</strong>
            <span>MVP에서는 아직 제공하지 않아요.</span>
          </span>
          <span className="badge">준비 중</span>
        </div>
        <div className="list-row">
          <span className="list-row-main">
            <strong>룰팩</strong>
            <span>{bundledRulePack.meta.status}</span>
          </span>
          <span className="badge">{bundledRulePack.meta.version}</span>
        </div>
      </section>

      <section className="section stack">
        <button className="button secondary full" type="button" onClick={downloadData}>
          <Download size={18} aria-hidden="true" /> 내 데이터 내보내기
        </button>
        <button className="button danger full" type="button" onClick={openDeleteDialog}>
          <Trash2 size={18} aria-hidden="true" /> 전체 데이터 삭제
        </button>
      </section>
      <dialog
        ref={deleteDialogRef}
        onCancel={(event) => {
          if (deleting) {
            event.preventDefault();
          }
        }}
      >
        <div className="stack">
          <div>
            <h2>전체 데이터를 삭제할까요?</h2>
            <p className="subcopy">이 브라우저에 저장된 시술, 제품, 체크 기록을 모두 삭제합니다.</p>
          </div>

          {deleteError ? (
            <div className="notice">
              <span>{deleteError}</span>
            </div>
          ) : null}

          <button
            className="button danger full"
            type="button"
            disabled={deleting}
            onClick={() => void clearData()}
          >
            {deleting ? '삭제 중...' : '전체 삭제'}
          </button>

          <button
            className="button secondary full"
            type="button"
            disabled={deleting}
            onClick={closeDeleteDialog}
          >
            취소
          </button>
        </div>
      </dialog>
    </AppShell>
  );
}

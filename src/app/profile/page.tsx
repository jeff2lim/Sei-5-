'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { LoadingScreen } from '@/components/common/loading-screen';
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

export default function ProfilePage() {
  const router = useRouter();
  const hydrated = useRecoveryStore((state) => state.hydrated);
  const session = useRecoveryStore((state) => state.session);
  const exportData = useRecoveryStore((state) => state.exportData);
  const deleteAllData = useRecoveryStore((state) => state.deleteAllData);
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

  async function clearData() {
    if (!window.confirm('이 브라우저에 저장된 시술, 제품, 체크 기록을 모두 삭제할까요?')) return;
    await deleteAllData();
    router.replace('/');
  }

  const menu = [
    { href: '/products', label: '등록 제품', value: `${session?.products.length ?? 0}개`, icon: Package },
    {
      href: '/records',
      label: '시술 정보',
      value: session?.procedure?.performedAt ?? '미등록',
      icon: CalendarDays,
    },
    { href: '/consent', label: '동의 내역', value: '확인·변경', icon: ShieldCheck },
    { href: '/legal/privacy', label: '개인정보처리방침', value: '', icon: FileText },
    { href: '/legal/terms', label: '서비스 이용약관', value: '', icon: FileText },
  ];

  return (
    <AppShell>
      <p className="eyebrow">Profile & settings</p>
      <h1 className="headline">마이</h1>
      <p className="subcopy">내 정보, 시술 기록과 데이터 설정을 관리해요.</p>

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
            <strong>데이터 저장 방식</strong>
            <span>이 브라우저의 localStorage에만 저장</span>
          </span>
          <span className="badge">local</span>
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
        <button className="button danger full" type="button" onClick={clearData}>
          <Trash2 size={18} aria-hidden="true" /> 전체 데이터 삭제
        </button>
      </section>
    </AppShell>
  );
}

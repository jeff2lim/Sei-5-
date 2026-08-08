'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { LoadingScreen } from '@/components/common/loading-screen';
import { VerdictBadge } from '@/components/verdict/verdict-badge';
import { analytics } from '@/domain/analytics';
import type { ProductCategory } from '@/domain/product';
import { getProcedureDay } from '@/domain/procedure';
import { evaluateCategory } from '@/rules/engine/evaluate';
import { bundledRulePack } from '@/rules/loaders/bundled-rule-pack';
import { useRecoveryStore } from '@/store/recovery-store';
import { ChevronRight, ClipboardCheck, Droplets, Info, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo } from 'react';

const categories: Array<{
  id: ProductCategory;
  label: string;
  description: string;
  icon: typeof Droplets;
}> = [
  { id: 'cleansing', label: '세안', description: '마찰을 줄이는 세안 안내', icon: Droplets },
  { id: 'skincare', label: '스킨케어', description: '등록 성분별 사용 안내', icon: Sparkles },
  { id: 'outing', label: '외출준비', description: '제형과 자외선 차단 안내', icon: ShieldCheck },
];

export default function HomePage() {
  const hydrated = useRecoveryStore((state) => state.hydrated);
  const session = useRecoveryStore((state) => state.session);
  const day = session?.procedure
    ? getProcedureDay(session.procedure.performedAt, new Date())
    : null;
  const categoryVerdicts = useMemo(
    () =>
      day === null
        ? []
        : categories.map((category) =>
            evaluateCategory(
              category.id,
              session?.products ?? [],
              day,
              bundledRulePack,
              session?.profile.sensitivity ?? 'normal',
            ),
          ),
    [day, session?.products, session?.profile.sensitivity],
  );

  useEffect(() => {
    if (day !== null) {
      analytics.track({
        name: 'home_viewed',
        procedureDay: day,
        rulePackVersion: bundledRulePack.meta.version,
      });
    }
  }, [day]);

  if (!hydrated) return <LoadingScreen />;
  if (!session?.procedure) {
    return (
      <AppShell>
        <div className="empty-state">
          <h2>시술 기록이 필요해요</h2>
          <p>시술일을 입력하면 날짜별 안내를 시작할 수 있어요.</p>
          <Link className="button" href="/onboarding/procedure">
            시술일 입력
          </Link>
        </div>
      </AppShell>
    );
  }
  const currentDay = day ?? 0;

  const todayCheck = session.checkIns.some(
    (checkIn) => checkIn.checkedAt.slice(0, 10) === new Date().toISOString().slice(0, 10),
  );

  return (
    <AppShell>
      <header>
        <p className="eyebrow">Picotoning · D+{currentDay}</p>
        <h1 className="headline">
          {currentDay === 7 ? '한 주의 회복을 잘 기록했어요.' : '오늘의 회복 안내예요.'}
        </h1>
        <p className="subcopy">선택한 정보에 따라 오늘의 안내 항목이 달라졌습니다.</p>
      </header>

      <section className="section hero-card">
        <span className="badge">D+{currentDay}</span>
        <h2 className="headline" style={{ marginTop: 14 }}>
          {currentDay === 0
            ? '오늘은 이것만 하면 돼요 — 미온수 세안 · 보습 · 외출 자제'
            : currentDay === 7
              ? '회복기를 마쳤어요. 이제 한꺼번에 말고 순서대로 다시 시작해요.'
              : currentDay >= 14
                ? '재개기를 마쳤어요. 남아 있는 주의 항목을 확인해 주세요.'
                : '자극을 줄이고, 피부 느낌을 천천히 확인하세요.'}
        </h2>
        <p className="subcopy">
          이 안내는 입력한 속성과 룰팩 {bundledRulePack.meta.version}을 기준으로 표시됩니다.
        </p>
      </section>

      <section className="section">
        <h2 className="section-title">내 제품으로 보는 오늘</h2>
        <div className="stack">
          {categories.map(({ id, label, description, icon: Icon }, index) => {
            const verdict = categoryVerdicts[index];
            return (
              <Link className="category-card" href={`/guide/${id}`} key={id}>
                <span className="category-icon">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <span className="list-row-main">
                  <strong>{label}</strong>
                  <span>
                    {verdict.products.length
                      ? `${verdict.products.length}개 제품 · ${description}`
                      : `등록 제품 없음 · ${description}`}
                  </span>
                </span>
                <span style={{ display: 'grid', justifyItems: 'end', gap: 7 }}>
                  <VerdictBadge level={verdict.level} />
                  <ChevronRight size={17} color="var(--ink-soft)" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section card">
        <div className="list-row" style={{ paddingTop: 0 }}>
          <div className="list-row-main">
            <strong>오늘 피부 상태 체크</strong>
            <span>{todayCheck ? '오늘 기록을 완료했어요.' : '최대 5개 항목을 직접 확인해요.'}</span>
          </div>
          {todayCheck ? <VerdictBadge level="go" /> : <ClipboardCheck color="var(--teal)" />}
        </div>
        <Link className="button full" href="/check-in" style={{ marginTop: 12 }}>
          {todayCheck ? '다시 체크하기' : '상태 체크 시작'}
        </Link>
      </section>

      <div className="notice section">
        <Info size={18} aria-hidden="true" />
        <span>
          이 안내는 진단이나 의료진의 판단을 대신하지 않습니다. 증상이 새로 생기거나 심해지면
          시술받은 병원 또는 의료기관에 문의하세요.
        </span>
      </div>
    </AppShell>
  );
}

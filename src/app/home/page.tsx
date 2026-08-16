'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { LoadingScreen } from '@/components/common/loading-screen';
import { VerdictBadge } from '@/components/verdict/verdict-badge';
import { analytics } from '@/domain/analytics';
import type { ProductCategory, VerdictLevel } from '@/domain/product';
import { getProcedureDay } from '@/domain/procedure';
import { evaluateCategory } from '@/rules/engine/evaluate';
import { rulePackMeta } from '@/rules/loaders/bundled-rule-pack';
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

/** 룰테이블 v5가 D+0~14를 커버합니다. 이후 날짜는 D+14 판정으로 고정됩니다. */
const RECOVERY_WINDOW_DAYS = 14;

function getRecoveryCompleteLabel(level: VerdictLevel) {
  switch (level) {
    case 'consult':
      return '병원 확인';
    case 'go':
      return '재개 가능';
    case 'care':
      return '천천히';
    case 'stop':
      return '계속 주의';
    case 'unknown':
    default:
      return '확인 필요';
  }
}

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
        rulePackVersion: rulePackMeta.version,
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

  // 회복기와 회복 완료 화면 양쪽에서 같은 진입점을 씁니다.
  const checkInCard = (
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
  );

  const recoveryItems = categoryVerdicts.flatMap((categoryVerdict) =>
    categoryVerdict.products.flatMap((verdict) => {
      const product = session.products.find((item) => item.id === verdict.productId);

      return product ? [{ product, verdict }] : [];
    }),
  );

  const resumableItems = recoveryItems.filter(({ verdict }) => verdict.level === 'go');

  const cautionItems = recoveryItems.filter(
    ({ verdict }) =>
      verdict.level === 'consult' || verdict.level === 'care' || verdict.level === 'stop',
  );

  const unknownItems = recoveryItems.filter(({ verdict }) => verdict.level === 'unknown');

  if (day !== null && day > RECOVERY_WINDOW_DAYS) {
    return (
      <AppShell>
        <header>
          <p className="eyebrow">Picotoning · D+{day}</p>
          <h1 className="headline">2주 회복 과정을 잘 기록했어요.</h1>
          <p className="subcopy">
            피코토닝 후 D+{RECOVERY_WINDOW_DAYS}까지의 회복·재개 기간을 마쳤어요.
          </p>
        </header>

        <section className="section hero-card">
          <span className="badge go">회복 완료</span>

          <h2 className="headline" style={{ marginTop: 14 }}>
            이제 대부분의 일상 관리를
            <br />
            서서히 재개할 수 있어요.
          </h2>

          <p className="subcopy">
            아래 안내는 룰테이블의 마지막 날인 D+{RECOVERY_WINDOW_DAYS} 기준으로 계속
            표시됩니다.
          </p>
        </section>

        <section className="section verdict-panel care">
          <span className="badge care">필수</span>
          <h2>☀️ 자외선 차단은 계속!</h2>
          <p>
            시술 부위는 색소침착(PIH)에 몇 주간 예민해요. 외출 시 선크림 SPF 50+는 앞으로도 꼭
            발라주세요.
          </p>
        </section>

        <section className="section">
          <h2 className="section-title">이제부터</h2>

          <div className="recovery-summary">
            {resumableItems.length > 0 ? (
              resumableItems.map(({ product, verdict }) => (
                <div className="list-row" key={product.id}>
                  <div className="list-row-main">
                    <strong>{product.name}</strong>
                    <span>현재 룰 기준으로 재개할 수 있어요.</span>
                  </div>
                  <span className={`badge ${verdict.level}`}>
                    {getRecoveryCompleteLabel(verdict.level)}
                  </span>
                </div>
              ))
            ) : (
              <p className="recovery-summary-empty">
                현재 재개 가능으로 표시된 등록 제품이 없어요.
              </p>
            )}

            {cautionItems.length > 0 ? (
              cautionItems.map(({ product, verdict }) => (
                <div className="list-row" key={product.id}>
                  <div className="list-row-main">
                    <strong>{product.name}</strong>
                    <span>
                      {verdict.level === 'consult'
                        ? '사용 전에 병원 확인이 필요한 항목이에요.'
                        : verdict.level === 'stop'
                          ? '아직은 사용을 쉬어가는 항목이에요.'
                          : '무리하지 말고 천천히 재개하세요.'}
                    </span>
                  </div>

                  <span className={`badge ${verdict.level}`}>
                    {getRecoveryCompleteLabel(verdict.level)}
                  </span>
                </div>
              ))
            ) : (
              <p className="recovery-summary-empty">현재 주의가 필요한 등록 제품이 없어요.</p>
            )}

            {unknownItems.map(({ product, verdict }) => (
              <div className="list-row" key={product.id}>
                <div className="list-row-main">
                  <strong>{product.name}</strong>
                  <span>현재 연결된 판정 정보가 부족해요.</span>
                </div>
                <span className={`badge ${verdict.level}`}>
                  {getRecoveryCompleteLabel(verdict.level)}
                </span>
              </div>
            ))}

          </div>
        </section>

        {checkInCard}

        <section className="section stack">
          <Link className="button full" href="/records?addSchedule=1">
            다음 시술 일정 잡기
          </Link>

          <Link className="button secondary full" href="/records">
            회복 기록 돌아보기
          </Link>
        </section>
      </AppShell>
    );
  }

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
          이 안내는 입력한 속성과 룰팩 {rulePackMeta.version}을 기준으로 표시됩니다.
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

      {checkInCard}

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

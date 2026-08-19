'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { CombinationGroup } from '@/components/combinations/combination-group';
import { useCombinationPick } from '@/components/combinations/use-combination-pick';
import { LoadingScreen } from '@/components/common/loading-screen';
import { VerdictBadge } from '@/components/verdict/verdict-badge';
import type { VerdictLevel } from '@/domain/product';
import { getProcedureDay } from '@/domain/procedure';
import { evaluateProductCollection } from '@/rules/engine/evaluate';
import { resolveCombinationState, toCombinationUiProduct } from '@/ruletable/combine';
import { ingredientGroups } from '@/ruletable/data';
import { getNextProcedureDay } from '@/ruletable/date';
import { useRecoveryStore } from '@/store/recovery-store';
import { ChevronRight, PackagePlus, Plus } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const rank: Record<VerdictLevel, number> = { consult: 4, stop: 3, care: 2, unknown: 1, go: 0 };

export default function ProductsPage() {
  const hydrated = useRecoveryStore((state) => state.hydrated);
  const session = useRecoveryStore((state) => state.session);
  const [view, setView] = useState<'products' | 'attributes'>('products');
  const [showPickToast, setShowPickToast] = useState(false);
  const day = session?.procedure ? getProcedureDay(session.procedure.performedAt, new Date()) : 0;
  const sensitivity = session?.profile.sensitivity ?? 'normal';
  const nextProcedureDay = getNextProcedureDay(
    session?.procedure?.performedAt,
    session?.profile.nextProcedureAt,
  );
  const { selectedProductId, selectProduct } = useCombinationPick(session?.procedure?.id, day);
  const productState = evaluateProductCollection(
    session?.products ?? [],
    day,
    sensitivity,
    nextProcedureDay,
  );
  const rows =
    productState.status === 'evaluated'
      ? [...productState.items].sort((a, b) => rank[b.verdict.level] - rank[a.verdict.level])
      : [];
  const latestCheckIn = [...(session?.checkIns ?? [])]
    .filter((checkIn) => checkIn.procedureDay === day)
    .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))[0];
  const combinationState = resolveCombinationState({
    day,
    sensitivity,
    userProducts: rows.map(({ product, verdict }) =>
      toCombinationUiProduct(product, verdict.level),
    ),
    symptoms: latestCheckIn?.answers.map((answer) => ({
      id: answer.symptomId,
      present: answer.present,
      severity: answer.severity,
    })),
    nextProcedureDay,
    selectedProductId,
  });
  const pickProduct = useCallback(
    (productId: string) => {
      const isFirstPick = selectedProductId === null;
      selectProduct(productId);
      if (isFirstPick) {
        setShowPickToast(true);
        window.setTimeout(() => setShowPickToast(false), 2600);
      }
    },
    [selectProduct, selectedProductId],
  );

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    if (search.get('tab') !== 'ingredient') return;
    setView('attributes');
    window.setTimeout(() => {
      document
        .getElementById('combination')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  }, []);

  if (!hydrated) return <LoadingScreen />;
  const counts = (['consult', 'stop', 'care', 'unknown', 'go'] as const).map(
    (level) => rows.filter((row) => row.verdict.level === level).length,
  );
  const productGroups = [
    {
      level: 'consult',
      label: '병원 확인이 필요해요',
    },
    {
      level: 'stop',
      label: '지금은 멈춰주세요',
    },
    {
      level: 'care',
      label: '아직 기다려주세요',
    },
    {
      level: 'unknown',
      label: '연결된 판정 정보가 부족해요',
    },
    {
      level: 'go',
      label: '계속 쓰셔도 돼요',
    },
  ] as const;

  const grouped = ingredientGroups
    .map((attribute) => {
      const matching = rows.flatMap(({ product, verdict }) => {
        const detail = verdict.details.find((item) => item.attributeId === attribute.id);

        return detail ? [{ product, detail }] : [];
      });

      const mostConservative = [...matching].sort(
        (a, b) => rank[b.detail.level] - rank[a.detail.level],
      )[0];

      return {
        attribute,
        products: matching,
        level: mostConservative?.detail.level,
        reason: mostConservative?.detail.reason,
      };
    })
    .filter((row) => row.products.length > 0)
    .sort((a, b) => rank[b.level ?? 'unknown'] - rank[a.level ?? 'unknown']);

  const flaggedAttributes = grouped.filter(({ level }) => level !== 'go');

  const safeAttributes = grouped.filter(({ level }) => level === 'go');

  return (
    <AppShell>
      <p className="eyebrow">My products · D+{day}</p>
      <h1 className="headline">내 제품</h1>
      <p className="subcopy">병원 확인 → 중단 → 주의 → 정보 없음 → 가능 순서로 정렬돼요.</p>

      <section className="section summary-grid" aria-label="제품 판정 요약">
        {[
          { label: '병원 확인', count: counts[0], level: 'consult' },
          { label: '중단', count: counts[1], level: 'stop' },
          { label: '주의', count: counts[2], level: 'care' },
          { label: '정보 없음', count: counts[3], level: 'unknown' },
          { label: '가능', count: counts[4], level: 'go' },
        ].map(({ label, count, level }) => (
          <div className={`summary-cell ${level}`} key={label}>
            <strong>{count}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <div className="segmented section" aria-label="제품 보기 방식">
        <button
          type="button"
          aria-pressed={view === 'products'}
          onClick={() => setView('products')}
        >
          제품별
        </button>
        <button
          type="button"
          aria-pressed={view === 'attributes'}
          onClick={() => setView('attributes')}
        >
          성분·속성별
        </button>
      </div>

      <section className="section">
        {productState.status === 'empty' ? (
          <div className="empty-state">
            <PackagePlus size={32} aria-hidden="true" />
            <h2>등록한 제품이 없어요</h2>
            <p>제품을 등록하면 날짜별 안내와 결정 근거를 볼 수 있어요.</p>
            <Link className="button" href="/products/new/category">
              제품 등록
            </Link>
          </div>
        ) : view === 'products' ? (
          <div>
            {productGroups.map(({ level, label }) => {
              const products = rows.filter(({ verdict }) => verdict.level === level);
              if (products.length === 0) {
                return null;
              }
              return (
                <div className="product-verdict-group" key={level}>
                  <div className={`product-group-head attribute-group-label ${level}`}>
                    <strong>{label}</strong>
                    <span>{products.length}</span>
                    <i aria-hidden="true" />
                  </div>
                  {products.map(({ product, verdict }) => (
                    <Link
                      className="product-status-row"
                      href={`/products/${product.id}`}
                      key={product.id}
                    >
                      <span className="product-status-main">
                        <strong>{product.name}</strong>
                        <span className="product-attribute-count">
                          {verdict.details.filter((detail) => detail.level !== 'unknown').length}개
                          판정 항목
                        </span>
                      </span>
                      <span className="product-status-badge">
                        <VerdictBadge level={verdict.level} />
                      </span>
                      <span className="product-status-open" aria-hidden="true">
                        <ChevronRight size={18} aria-hidden="true" />
                      </span>
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="stack">
            <>
              {flaggedAttributes.length > 0 ? (
                <>
                  <div className="attribute-group-label">
                    지금 걸린 성분 ({flaggedAttributes.length})
                  </div>

                  {flaggedAttributes.map(({ attribute, products, level, reason }) => (
                    <div className="card" key={attribute.id}>
                      <div className="list-row" style={{ paddingTop: 0 }}>
                        <span className="list-row-main">
                          <strong>{attribute.label}</strong>
                          <span>등록된 제품: {products.length}개</span>
                          <span className="attribute-product-list">
                            {products.map(({ product }) => product.name).join(' · ')}
                          </span>
                        </span>
                        {level ? <VerdictBadge level={level} /> : null}
                      </div>
                      {reason ? <p className="subcopy">{reason}</p> : null}
                    </div>
                  ))}
                </>
              ) : null}
              <CombinationGroup
                variant="group"
                state={combinationState}
                day={day}
                onPick={pickProduct}
              />
              {safeAttributes.length > 0 ? (
                <>
                  <div className="attribute-group-label">문제 없는 성분</div>

                  {safeAttributes.map(({ attribute, products, level, reason }) => (
                    <div className="card" key={attribute.id}>
                      <div className="list-row" style={{ paddingTop: 0 }}>
                        <span className="list-row-main">
                          <strong>{attribute.label}</strong>
                          <span>등록된 제품: {products.length}개</span>
                        </span>
                        {level ? <VerdictBadge level={level} /> : null}
                      </div>
                      {reason ? <p className="subcopy">{reason}</p> : null}
                    </div>
                  ))}
                </>
              ) : null}
            </>
          </div>
        )}
      </section>

      <div className="sticky-actions">
        <Link className="button full" href="/products/new/category">
          <Plus size={18} aria-hidden="true" /> 제품 등록하기
        </Link>
      </div>
      {showPickToast ? (
        <div className="combination-toast" role="status">
          판정이 바뀐 건 아니에요. 오늘 순서만 정한 거예요.
        </div>
      ) : null}
    </AppShell>
  );
}

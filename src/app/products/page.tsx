'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { LoadingScreen } from '@/components/common/loading-screen';
import { VerdictBadge } from '@/components/verdict/verdict-badge';
import type { VerdictLevel } from '@/domain/product';
import { getProcedureDay } from '@/domain/procedure';
import { evaluateProduct } from '@/rules/engine/evaluate';
import { bundledRulePack } from '@/rules/loaders/bundled-rule-pack';
import { useRecoveryStore } from '@/store/recovery-store';
import { ChevronRight, PackagePlus, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const rank: Record<VerdictLevel, number> = { stop: 3, care: 2, unknown: 1, go: 0 };

export default function ProductsPage() {
  const hydrated = useRecoveryStore((state) => state.hydrated);
  const session = useRecoveryStore((state) => state.session);
  const [view, setView] = useState<'products' | 'attributes'>('products');
  if (!hydrated) return <LoadingScreen />;
  const day = session?.procedure ? getProcedureDay(session.procedure.performedAt, new Date()) : 0;
  const rows = (session?.products ?? [])
    .map((product) => ({ product, verdict: evaluateProduct(product, day, bundledRulePack) }))
    .sort((a, b) => rank[b.verdict.level] - rank[a.verdict.level]);
  const counts = (['stop', 'care', 'unknown', 'go'] as const).map(
    (level) => rows.filter((row) => row.verdict.level === level).length,
  );

  const grouped = bundledRulePack.attributes
    .map((attribute) => {
      const matching = rows.filter(({ product }) => product.attributeIds.includes(attribute.id));
      const level = matching.sort((a, b) => rank[b.verdict.level] - rank[a.verdict.level])[0]?.verdict
        .level;
      return { attribute, products: matching, level };
    })
    .filter((row) => row.products.length);

  return (
    <AppShell>
      <p className="eyebrow">My products · D+{day}</p>
      <h1 className="headline">내 제품</h1>
      <p className="subcopy">판정은 중단 → 주의 → 정보 없음 → 가능 순서로 정렬돼요.</p>

      <section className="section summary-grid" aria-label="제품 판정 요약">
        {[
          ['중단', counts[0]],
          ['주의', counts[1]],
          ['정보 없음', counts[2]],
          ['가능', counts[3]],
        ].map(([label, count]) => (
          <div className="summary-cell" key={label}>
            <strong>{count}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <div className="segmented section" aria-label="제품 보기 방식">
        <button type="button" aria-pressed={view === 'products'} onClick={() => setView('products')}>
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
        {!rows.length ? (
          <div className="empty-state">
            <PackagePlus size={32} aria-hidden="true" />
            <h2>등록한 제품이 없어요</h2>
            <p>제품을 등록하면 날짜별 안내와 결정 근거를 볼 수 있어요.</p>
            <Link className="button" href="/products/new/category">
              제품 등록
            </Link>
          </div>
        ) : view === 'products' ? (
          <div className="card">
            {rows.map(({ product, verdict }) => (
              <Link className="list-row" href={`/products/${product.id}`} key={product.id}>
                <span className="list-row-main">
                  <strong>{product.name}</strong>
                  <span>{product.attributeIds.length || 0}개 속성</span>
                </span>
                <VerdictBadge level={verdict.level} />
                <ChevronRight size={17} aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="stack">
            {grouped.map(({ attribute, products, level }) => (
              <div className="card" key={attribute.id}>
                <div className="list-row" style={{ paddingTop: 0 }}>
                  <span className="list-row-main">
                    <strong>{attribute.name}</strong>
                    <span>등록된 제품: {products.length}개</span>
                  </span>
                  {level ? <VerdictBadge level={level} /> : null}
                </div>
                <p className="subcopy">{products[0]?.verdict.details.find((d) => d.attributeId === attribute.id)?.reason}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="sticky-actions">
        <Link className="button full" href="/products/new/category">
          <Plus size={18} aria-hidden="true" /> 제품 등록하기
        </Link>
      </div>
    </AppShell>
  );
}

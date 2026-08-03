'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { Topbar } from '@/components/common/topbar';
import { LoadingScreen } from '@/components/common/loading-screen';
import { useRecoveryStore } from '@/store/recovery-store';
import { PackagePlus, Plus } from 'lucide-react';
import Link from 'next/link';

const categoryLabels = {
  cleansing: '세안',
  skincare: '스킨케어',
  outing: '외출준비',
};

export default function OnboardingProductsPage() {
  const hydrated = useRecoveryStore((state) => state.hydrated);
  const session = useRecoveryStore((state) => state.session);
  const products = session?.products ?? [];
  if (!hydrated) return <LoadingScreen navigation={false} />;

  return (
    <AppShell navigation={false}>
      <Topbar title="내 제품" />
      <div className="progress" aria-label="4단계 중 2단계">
        <span className="done" />
        <span className="active" />
        <span />
        <span />
      </div>
      <p className="eyebrow">Step 2 · Products</p>
      <h1 className="headline">평소 쓰는 제품을 등록해 보세요.</h1>
      <p className="subcopy">제품 없이도 먼저 시작할 수 있고, 언제든 추가할 수 있어요.</p>

      <section className="section">
        {products.length ? (
          <div className="card">
            {products.map((product) => (
              <div className="list-row" key={product.id}>
                <div className="list-row-main">
                  <strong>{product.name}</strong>
                  <span>
                    {categoryLabels[product.category]} · 속성 {product.attributeIds.length}개
                  </span>
                </div>
                <span className="badge">{categoryLabels[product.category]}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <PackagePlus size={32} aria-hidden="true" />
            <h2>아직 등록한 제품이 없어요</h2>
            <p>제품명만으로 성분을 자동 추정하지 않아요. 표시된 속성을 직접 선택합니다.</p>
          </div>
        )}
      </section>

      <div className="sticky-actions">
        <Link className="button secondary full" href="/onboarding/products/new/category">
          <Plus size={18} aria-hidden="true" /> 제품 등록하기
        </Link>
        <Link className="button full" href="/onboarding/cleansing">
          {products.length ? '다음' : '제품 없이 다음'}
        </Link>
      </div>
    </AppShell>
  );
}

'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { LoadingScreen } from '@/components/common/loading-screen';
import { Topbar } from '@/components/common/topbar';
import { VerdictBadge, verdictLabel } from '@/components/verdict/verdict-badge';
import { analytics } from '@/domain/analytics';
import { getProcedureDay } from '@/domain/procedure';
import { evaluateProduct } from '@/rules/engine/evaluate';
import { bundledRulePack } from '@/rules/loaders/bundled-rule-pack';
import { useRecoveryStore } from '@/store/recovery-store';
import { Info, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProductDetailPage() {
  const params = useParams<{ productId: string }>();
  const router = useRouter();
  const hydrated = useRecoveryStore((state) => state.hydrated);
  const session = useRecoveryStore((state) => state.session);
  const deleteProduct = useRecoveryStore((state) => state.deleteProduct);
  const [deleting, setDeleting] = useState(false);
  const product = session?.products.find((item) => item.id === params.productId);
  const day = session?.procedure ? getProcedureDay(session.procedure.performedAt, new Date()) : 0;
  const verdict = product ? evaluateProduct(product, day, bundledRulePack) : null;

  useEffect(() => {
    if (verdict) analytics.track({ name: 'product_detail_viewed', verdict: verdict.level });
  }, [verdict]);

  if (!hydrated || deleting) return <LoadingScreen />;
  if (!product || !verdict) {
    return (
      <AppShell>
        <div className="empty-state">
          <h2>제품을 찾을 수 없어요</h2>
          <Link className="button" href="/products">
            내 제품으로 이동
          </Link>
        </div>
      </AppShell>
    );
  }

  const currentProduct = product;

  async function remove() {
    if (!window.confirm(`“${currentProduct.name}” 제품을 삭제할까요?`)) return;
    setDeleting(true);

    try {
      await deleteProduct(currentProduct.id);
      router.replace('/products');
    } catch {
        setDeleting(false);
        window.alert('제품을 삭제하지 못했어요. 다시 시도해 주세요.');
      }
  }

  return (
    <AppShell>
      <Topbar title="내 제품" closeHref="/products" />
      <div className={`verdict-panel ${verdict.level}`}>
        <VerdictBadge level={verdict.level} />
        <h2>{product.name}</h2>
        <p>
          오늘 D+{day} · {verdictLabel(verdict.level)}
          {verdict.resumeDay !== undefined ? ` · D+${verdict.resumeDay} 재개 안내` : ''}
        </p>
      </div>

      <section className="section">
        <h2 className="section-title">결정 근거</h2>
        {verdict.details.length ? (
          <div className="stack">
            {verdict.details.map((detail) => {
              const attribute = bundledRulePack.attributes.find(
                (item) => item.id === detail.attributeId,
              );
              return (
                <div className="card" key={detail.attributeId}>
                  <div className="list-row" style={{ paddingTop: 0 }}>
                    <span className="list-row-main">
                      <strong>{attribute?.name ?? detail.attributeId}</strong>
                      <span>{attribute?.description}</span>
                    </span>
                    <VerdictBadge level={detail.level} />
                  </div>
                  <p className="subcopy">{detail.reason}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <h2>선택한 속성이 없어요</h2>
            <p>정보가 없으므로 가능으로 바꾸지 않고 ‘판정 정보 없음’으로 유지합니다.</p>
          </div>
        )}
      </section>

      <div className="notice section">
        <Info size={18} aria-hidden="true" />
        <span>
          제품 전체 판정은 가장 보수적인 속성 판정을 따릅니다. 같은 ‘주의’가 여러 개면 가장 늦은
          재개일을 사용합니다.
        </span>
      </div>

      <button className="button danger full section" type="button" onClick={remove}>
        <Trash2 size={18} aria-hidden="true" /> 제품 삭제
      </button>
    </AppShell>
  );
}

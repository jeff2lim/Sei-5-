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
import { useEffect, useRef, useState } from 'react';

export default function ProductDetailPage() {
  const params = useParams<{ productId: string }>();
  const router = useRouter();
  const hydrated = useRecoveryStore((state) => state.hydrated);
  const session = useRecoveryStore((state) => state.session);
  const deleteProduct = useRecoveryStore((state) => state.deleteProduct);
  const [deleting, setDeleting] = useState(false);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const product = session?.products.find((item) => item.id === params.productId);
  const day = session?.procedure ? getProcedureDay(session.procedure.performedAt, new Date()) : 0;
  const verdict = product
    ? evaluateProduct(product, day, bundledRulePack, session?.profile.sensitivity ?? 'normal')
    : null;

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
    setDeleteError(null);
    deleteDialogRef.current?.close();
    setDeleting(true);

    try {
      await deleteProduct(currentProduct.id);
      router.replace('/products');
    } catch {
      setDeleting(false);
      setDeleteError('제품을 삭제하지 못했어요. 다시 시도해 주세요.');
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
              return (
                <div className="card" key={detail.attributeId}>
                  <div className="list-row" style={{ paddingTop: 0 }}>
                    <span className="list-row-main">
                      <strong>{detail.label ?? detail.attributeId}</strong>
                      <span>
                        {detail.targetType === 'ingredient_group' ? '성분 기준' : '제형·세정 기준'}
                      </span>
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
      {verdict.notes?.length ? (
        <section className="section notice">
          <Info size={18} aria-hidden="true" />
          <span>{verdict.notes.join(' ')}</span>
        </section>
      ) : null}

      {deleteError ? (
        <div className="notice section">
          <span>{deleteError}</span>
        </div>
      ) : null}
      <button
        className="button danger full section"
        type="button"
        onClick={() => {
          setDeleteError(null);
          deleteDialogRef.current?.showModal();
        }}
      >
        <Trash2 size={18} aria-hidden="true" /> 제품 삭제
      </button>
      <dialog ref={deleteDialogRef}>
        <div className="stack">
          <div>
            <h2>제품을 삭제할까요?</h2>
            <p className="subcopy">“{currentProduct.name}” 제품을 삭제합니다.</p>
          </div>

          <button className="button danger full" type="button" onClick={() => void remove()}>
            삭제하기
          </button>

          <button
            className="button secondary full"
            type="button"
            onClick={() => deleteDialogRef.current?.close()}
          >
            취소
          </button>
        </div>
      </dialog>
    </AppShell>
  );
}

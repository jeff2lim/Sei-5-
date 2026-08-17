'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { LoadingScreen } from '@/components/common/loading-screen';
import { ProductCategoryForm } from '@/components/products/product-category-form';
import { useRecoveryStore } from '@/store/recovery-store';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * 제품 수정 1단계. 기존 값을 draft에 실어 둔 뒤 등록과 같은 폼을 재사용합니다.
 * draft.editingProductId가 있으면 store가 새 제품 대신 이 제품을 갱신합니다.
 */
export default function ProductEditPage() {
  const params = useParams<{ productId: string }>();
  const hydrated = useRecoveryStore((state) => state.hydrated);
  const session = useRecoveryStore((state) => state.session);
  const setProductDraft = useRecoveryStore((state) => state.setProductDraft);
  const product = session?.products.find((item) => item.id === params.productId);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!hydrated || !product || seeded) return;
    setProductDraft({
      name: product.name,
      category: product.category,
      editingProductId: product.id,
    });
    setSeeded(true);
  }, [hydrated, product, seeded, setProductDraft]);

  if (!hydrated) return <LoadingScreen navigation={false} />;

  if (!product) {
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

  // draft가 채워진 뒤에 폼을 올려야 기존 이름·카테고리가 초기값으로 들어갑니다.
  if (!seeded) return <LoadingScreen navigation={false} />;

  return (
    <ProductCategoryForm
      cancelHref={`/products/${product.id}`}
      nextHref={`/products/${product.id}/edit/attributes`}
      editingProductId={product.id}
    />
  );
}

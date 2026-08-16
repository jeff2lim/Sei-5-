'use client';

import { ProductAttributesForm } from '@/components/products/product-attributes-form';
import { useParams } from 'next/navigation';

/** 제품 수정 2단계. 저장하면 제품 상세로 돌아갑니다. */
export default function ProductEditAttributesPage() {
  const params = useParams<{ productId: string }>();
  return (
    <ProductAttributesForm
      successHref={`/products/${params.productId}`}
      restartHref={`/products/${params.productId}/edit`}
    />
  );
}

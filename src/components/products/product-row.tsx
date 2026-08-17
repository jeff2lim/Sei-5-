import { VerdictBadge } from '@/components/verdict/verdict-badge';
import type { Product } from '@/domain/product';
import type { ProductVerdict } from '@/domain/verdict';
import Link from 'next/link';

export function ProductRow({
  product,
  verdict,
  combinationLabel = null,
}: {
  product: Product;
  verdict: ProductVerdict;
  combinationLabel?: 'today' | 'tomorrow' | null;
}) {
  const subtext =
    combinationLabel === 'today'
      ? '오늘 고르신 제품이에요'
      : (verdict.prepText ??
        verdict.details[0]?.reason ??
        '선택한 속성이 없어 판정 정보가 없습니다.');
  return (
    <Link
      className={`list-row product-row ${combinationLabel === 'today' ? 'combination-today' : ''}`}
      href={`/products/${product.id}`}
    >
      <span className="list-row-main">
        <strong>{product.name}</strong>
        <span>
          {verdict.resumeDay !== undefined ? `D+${verdict.resumeDay} 재개 안내 · ` : ''}
          {subtext}
        </span>
      </span>
      <span className="product-row-badges">
        <VerdictBadge level={verdict.level} />
        {combinationLabel === 'tomorrow' ? <small className="tomorrow-badge">내일</small> : null}
      </span>
    </Link>
  );
}

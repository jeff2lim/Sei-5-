'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import commerceItems from '../../../rules/commerce-items.json';
import { analytics } from '@/domain/analytics';
import type { CommerceItem } from '@/domain/commerce';
import { ExternalLink, Info } from 'lucide-react';

const items = commerceItems as CommerceItem[];

export default function RecommendationsPage() {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_COMMERCE !== 'false';
  const activeItems = enabled ? items.filter((item) => item.isActive) : [];

  return (
    <AppShell>
      <p className="eyebrow">Optional commerce</p>
      <h1 className="headline">제품 추천</h1>
      <p className="subcopy">안내 판정과 분리된 선택 영역입니다. 추천 상품이 판정을 바꾸지 않습니다.</p>
      <div className="notice section">
        <Info size={18} aria-hidden="true" />
        <span>광고·제휴 여부를 각 상품에 표시하며, 구매는 외부 사이트에서 이루어집니다.</span>
      </div>
      <section className="section stack">
        {activeItems.map((item) => (
          <article className="card" key={item.id}>
            <span className="badge">{item.relationship === 'editorial' ? '에디토리얼' : '광고·제휴'}</span>
            <h2 className="section-title" style={{ marginTop: 14, marginBottom: 4 }}>
              {item.name}
            </h2>
            <p className="subcopy" style={{ marginTop: 0 }}>
              {item.brand} · {item.disclosureText}
            </p>
            <a
              className="button secondary full"
              href={item.externalUrl}
              target="_blank"
              rel="noreferrer sponsored"
              style={{ marginTop: 16 }}
              onClick={() =>
                analytics.track({
                  name: 'commerce_item_clicked',
                  itemId: item.id,
                  placement: 'recommendations',
                })
              }
            >
              외부 판매처 보기 <ExternalLink size={17} aria-hidden="true" />
            </a>
          </article>
        ))}
        {!activeItems.length ? (
          <div className="empty-state">
            <h2>현재 노출 중인 추천이 없어요</h2>
            <p>추천 기능이 꺼져 있거나 활성 상품이 없습니다.</p>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}

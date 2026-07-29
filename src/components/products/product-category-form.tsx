'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { Topbar } from '@/components/common/topbar';
import type { ProductCategory } from '@/domain/product';
import { analytics } from '@/domain/analytics';
import { useRecoveryStore } from '@/store/recovery-store';
import { Droplets, ShieldCheck, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const categories: Array<{
  id: ProductCategory;
  title: string;
  description: string;
  icon: typeof Droplets;
}> = [
  { id: 'cleansing', title: '세안', description: '클렌저, 오일, 밤, 스크럽', icon: Droplets },
  { id: 'skincare', title: '스킨케어', description: '토너, 앰플, 크림, 연고형 화장품', icon: Sparkles },
  {
    id: 'outing',
    title: '외출준비',
    description: '선크림, 톤업·색조 겸용 제품',
    icon: ShieldCheck,
  },
];

export function ProductCategoryForm({ cancelHref }: { cancelHref: string }) {
  const router = useRouter();
  const draft = useRecoveryStore((state) => state.productDraft);
  const setDraft = useRecoveryStore((state) => state.setProductDraft);
  const [name, setName] = useState(draft.name);
  const [category, setCategory] = useState<ProductCategory | null>(draft.category);
  const [error, setError] = useState('');

  useEffect(() => analytics.track({ name: 'product_registration_started' }), []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('제품 이름을 입력해 주세요.');
      return;
    }
    if (!category) {
      setError('언제 쓰는 제품인지 선택해 주세요.');
      return;
    }
    setDraft({ name: name.trim(), category });
    router.push(`${cancelHref.startsWith('/onboarding') ? '/onboarding' : ''}/products/new/attributes`);
  }

  return (
    <AppShell navigation={false}>
      <Topbar title="제품 등록 · 1/2" closeHref={cancelHref} />
      <p className="eyebrow">When do you use it?</p>
      <h1 className="headline">언제 쓰는 제품인가요?</h1>
      <p className="subcopy">제품을 사용하는 순간에 맞춰 안내 화면에 배치할게요.</p>
      <form className="section stack" onSubmit={submit}>
        <div className="field">
          <label htmlFor="product-name">제품 이름</label>
          <input
            id="product-name"
            value={name}
            maxLength={60}
            placeholder="예: 매일 쓰는 보습 크림"
            onChange={(event) => {
              setName(event.target.value);
              setError('');
            }}
            aria-invalid={Boolean(error && !name.trim())}
          />
        </div>
        <fieldset className="choice-grid">
          <legend className="sr-only">제품 카테고리</legend>
          {categories.map(({ id, title, description, icon: Icon }) => (
            <label className="choice" key={id}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon size={18} aria-hidden="true" /> {title}
              </strong>
              <span>{description}</span>
              <input
                type="radio"
                name="category"
                checked={category === id}
                onChange={() => {
                  setCategory(id);
                  setError('');
                }}
              />
            </label>
          ))}
        </fieldset>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="sticky-actions">
          <button className="button full" type="submit">
            속성 선택하기
          </button>
        </div>
      </form>
    </AppShell>
  );
}

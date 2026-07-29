'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { Topbar } from '@/components/common/topbar';
import { analytics } from '@/domain/analytics';
import { bundledRulePack } from '@/rules/loaders/bundled-rule-pack';
import { useRecoveryStore } from '@/store/recovery-store';
import { Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ProductAttributesForm({ successHref }: { successHref: string }) {
  const router = useRouter();
  const draft = useRecoveryStore((state) => state.productDraft);
  const saveProduct = useRecoveryStore((state) => state.saveProduct);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (!draft.category) {
    return (
      <AppShell navigation={false}>
        <Topbar title="제품 등록 · 2/2" />
        <div className="empty-state">
          <h2>제품 정보가 비어 있어요</h2>
          <p>첫 단계에서 제품 이름과 카테고리를 다시 선택해 주세요.</p>
          <button
            className="button"
            type="button"
            onClick={() => router.replace(`${successHref}/new/category`)}
          >
            첫 단계로 이동
          </button>
        </div>
      </AppShell>
    );
  }

  const attributes = bundledRulePack.attributes.filter(
    (attribute) => attribute.category === draft.category,
  );

  async function submit() {
    setSaving(true);
    const product = await saveProduct(selected);
    analytics.track({
      name: 'product_saved',
      category: product.category,
      attributeCount: product.attributeIds.length,
    });
    router.push(successHref);
  }

  return (
    <AppShell navigation={false}>
      <Topbar title="제품 등록 · 2/2" />
      <p className="eyebrow">What does it contain?</p>
      <h1 className="headline">표시된 속성을 직접 선택해 주세요.</h1>
      <p className="subcopy">
        <span className="badge">{draft.name}</span>
      </p>
      <div className="notice section">
        <Info size={18} aria-hidden="true" />
        <span>제품 이름만으로 성분이나 속성을 자동 추정하지 않습니다. 모르면 선택하지 않아도 돼요.</span>
      </div>
      <fieldset className="section choice-grid">
        <legend className="sr-only">제품 속성</legend>
        {attributes.map((attribute) => (
          <label className="choice" key={attribute.id}>
            <strong>{attribute.name}</strong>
            <span>{attribute.description}</span>
            <input
              type="checkbox"
              checked={selected.includes(attribute.id)}
              onChange={(event) =>
                setSelected((current) =>
                  event.target.checked
                    ? [...current, attribute.id]
                    : current.filter((id) => id !== attribute.id),
                )
              }
            />
          </label>
        ))}
      </fieldset>
      <div className="sticky-actions">
        <button className="button full" type="button" disabled={saving} onClick={submit}>
          {selected.length ? `${selected.length}개 속성으로 저장` : '속성 미지정으로 저장'}
        </button>
      </div>
    </AppShell>
  );
}

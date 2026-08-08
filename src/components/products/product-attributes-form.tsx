'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { Topbar } from '@/components/common/topbar';
import { analytics } from '@/domain/analytics';
import { ingredientGroups, ingredientSynonyms, sunscreenTypes } from '@/ruletable/data';
import type { ProductRuleSelection } from '@/ruletable/types';
import { useRecoveryStore } from '@/store/recovery-store';
import { Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

const emptySelection = (): ProductRuleSelection => ({
  ingredientGroupIds: [],
  cleansingMethodIds: [],
  baseMakeupIds: [],
});

export function ProductAttributesForm({ successHref }: { successHref: string }) {
  const router = useRouter();
  const draft = useRecoveryStore((state) => state.productDraft);
  const saveProduct = useRecoveryStore((state) => state.saveProduct);
  const [selection, setSelection] = useState<ProductRuleSelection>(emptySelection);
  const [oilOrBalm, setOilOrBalm] = useState(false);
  const [scrubOrPeeling, setScrubOrPeeling] = useState(false);
  const [outingType, setOutingType] = useState<
    'serum_lotion' | 'regular_non_waterproof' | 'waterproof_stick' | 'cushion_base' | null
  >(null);
  const [saving, setSaving] = useState(false);
  const selectedCount = useMemo(
    () =>
      selection.ingredientGroupIds.length +
      selection.cleansingMethodIds.length +
      selection.baseMakeupIds.length +
      (selection.sunscreenTypeId ? 1 : 0),
    [selection],
  );

  if (!draft.category) {
    return (
      <AppShell navigation={false}>
        <Topbar title="제품 등록 · 2/2" />
        <div className="empty-state">
          <h2>제품 정보가 비어 있어요</h2>
          <p>첫 단계에서 제품 이름과 사용 시점을 다시 선택해 주세요.</p>
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

  function toggleIngredient(id: string, checked: boolean) {
    setSelection((current) => ({
      ...current,
      ingredientGroupIds: checked
        ? [...current.ingredientGroupIds, id]
        : current.ingredientGroupIds.filter((candidate) => candidate !== id),
    }));
  }

  async function submit() {
    setSaving(true);
    try {
      const nextSelection: ProductRuleSelection =
        draft.category === 'cleansing'
          ? {
              ...emptySelection(),
              cleansingMethodIds: [
                oilOrBalm ? 'cleansing_oil' : 'mild_acidic_foam',
                ...(scrubOrPeeling ? ['scrub_deep'] : []),
              ],
            }
          : draft.category === 'outing'
            ? {
                ...emptySelection(),
                sunscreenTypeId:
                  outingType && outingType !== 'cushion_base' ? outingType : undefined,
                baseMakeupIds: outingType === 'cushion_base' ? ['cushion'] : [],
              }
            : selection;
      const product = await saveProduct(nextSelection);
      analytics.track({
        name: 'product_saved',
        category: product.category,
        attributeCount:
          nextSelection.ingredientGroupIds.length +
          nextSelection.cleansingMethodIds.length +
          nextSelection.baseMakeupIds.length +
          (nextSelection.sunscreenTypeId ? 1 : 0),
      });
      router.push(successHref);
    } finally {
      setSaving(false);
    }
  }

  const canSave = draft.category !== 'outing' || outingType !== null;

  return (
    <AppShell navigation={false}>
      <Topbar title="제품 등록 · 2/2" />
      <p className="eyebrow">What do you use?</p>
      <h1 className="headline">
        {draft.category === 'cleansing'
          ? '세정 방식에 해당하는 항목을 알려주세요.'
          : draft.category === 'skincare'
            ? '전성분표에서 보이는 성분군을 선택해 주세요.'
            : '지울 때 부담을 기준으로 제형을 선택해 주세요.'}
      </h1>
      <p className="subcopy">
        <span className="badge">{draft.name}</span>
      </p>
      <div className="notice section">
        <Info size={18} aria-hidden="true" />
        <span>
          제품명으로 성분을 추측하지 않습니다. 연고·의약품은 현재 등록 대상이 아니며, 모르는 성분은
          선택하지 않아도 됩니다.
        </span>
      </div>

      {draft.category === 'cleansing' ? (
        <fieldset className="section choice-grid">
          <legend className="sr-only">세안 제품 특성</legend>
          <label className="choice">
            <strong>오일·밤 타입인가요?</strong>
            <span>오일이나 밤 제형은 2차 세안까지 포함한 세정 부담으로 안내해요.</span>
            <input
              type="checkbox"
              checked={oilOrBalm}
              onChange={(event) => setOilOrBalm(event.target.checked)}
            />
          </label>
          <label className="choice">
            <strong>스크럽·필링 기능이 있나요?</strong>
            <span>알갱이, 브러시 또는 물리적 각질 제거 기능을 포함해요.</span>
            <input
              type="checkbox"
              checked={scrubOrPeeling}
              onChange={(event) => setScrubOrPeeling(event.target.checked)}
            />
          </label>
        </fieldset>
      ) : null}

      {draft.category === 'skincare' ? (
        <fieldset className="section choice-grid">
          <legend className="sr-only">스킨케어 성분군</legend>
          {ingredientGroups.map((group) => {
            const synonyms = ingredientSynonyms[group.id]?.display_3;
            return (
              <label className="choice" key={group.id}>
                <strong>{group.label}</strong>
                <span>
                  {synonyms?.length
                    ? `전성분표 예: ${synonyms.join(' · ')}`
                    : group.judgment_mode === 'consult_only'
                      ? '병원에서 직접 받은 제품이면 선택하세요.'
                      : '향료 표기가 있으면 선택하세요. 판정이 아닌 주의 문구만 표시됩니다.'}
                </span>
                <input
                  type="checkbox"
                  checked={selection.ingredientGroupIds.includes(group.id)}
                  onChange={(event) => toggleIngredient(group.id, event.target.checked)}
                />
              </label>
            );
          })}
        </fieldset>
      ) : null}

      {draft.category === 'outing' ? (
        <fieldset className="section choice-grid">
          <legend className="sr-only">외출준비 제품 제형</legend>
          {[
            ...sunscreenTypes
              .filter((item) => item.id !== 'physical_cover')
              .map((item) => ({ id: item.id, label: item.label })),
            { id: 'cushion_base', label: '선쿠션·베이스 메이크업' },
          ].map((item) => (
            <label className="choice" key={item.id}>
              <strong>{item.label}</strong>
              <span>차단 방식보다 문지름과 세정 부담을 기준으로 판정합니다.</span>
              <input
                type="radio"
                name="outing-type"
                checked={outingType === item.id}
                onChange={() => setOutingType(item.id as NonNullable<typeof outingType>)}
              />
            </label>
          ))}
        </fieldset>
      ) : null}

      {draft.category === 'skincare' && selectedCount === 0 ? (
        <p className="subcopy section">성분을 모르시면 회복기에는 쉬어가는 쪽으로 안내합니다.</p>
      ) : null}

      <div className="sticky-actions">
        <button
          className="button full"
          type="button"
          disabled={saving || !canSave}
          onClick={submit}
        >
          {saving
            ? '저장 중…'
            : draft.category === 'skincare' && selectedCount === 0
              ? '성분 미지정으로 저장'
              : '제품 저장'}
        </button>
      </div>
    </AppShell>
  );
}

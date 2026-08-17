'use client';

import type {
  CombinationDisplayPair,
  CombinationDisplayProduct,
  CombinationState,
} from '@/ruletable/types';
import { Check } from 'lucide-react';

type CombinationGroupProps = {
  variant: 'sheet' | 'group';
  state: CombinationState;
  day: number;
  onPick: (productId: string) => void;
};

const relationLabel = {
  separate_days: '다른 날',
  separate_time: '아침·저녁',
  no_restriction: '같이 OK',
} as const;

function ProductChoices({
  products,
  selectedProductId,
  onPick,
}: {
  products: CombinationDisplayProduct[];
  selectedProductId: string | null;
  onPick: (productId: string) => void;
}) {
  return (
    <div className="combination-choices" role="radiogroup" aria-label="오늘 사용할 제품 선택">
      {products.map((product) => {
        const selected = selectedProductId === product.productId;
        return (
          <button
            className="combination-choice"
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onPick(product.productId)}
            key={product.productId}
          >
            <span className="combination-choice-mark" aria-hidden="true">
              {selected ? <Check size={14} strokeWidth={3} /> : null}
            </span>
            <span>{product.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function CombinationCard({
  pair,
  selectedProductId,
  onPick,
}: {
  pair: CombinationDisplayPair;
  selectedProductId: string | null;
  onPick: (productId: string) => void;
}) {
  const byId = new Map(pair.products.map((product) => [product.productId, product]));
  return (
    <article className={`combination-card ${pair.relation}`}>
      <div className="combination-card-head">
        <div>
          <h3>
            {pair.ingredientLabels[0]} <span aria-hidden="true">×</span> {pair.ingredientLabels[1]}
          </h3>
          <p>{pair.products.map((product) => product.name).join(' · ')}</p>
        </div>
        <span className={`combination-relation ${pair.relation}`}>
          {relationLabel[pair.relation]}
        </span>
      </div>
      <p className="combination-reason">{pair.reasonText}</p>
      {pair.relation === 'separate_days' ? (
        <ProductChoices
          products={pair.products}
          selectedProductId={selectedProductId}
          onPick={onPick}
        />
      ) : pair.relation === 'separate_time' && pair.slots ? (
        <div className="combination-slots">
          <span>
            <strong>{byId.get(pair.slots.morning)?.name}</strong>
            <small>아침</small>
          </span>
          <span>
            <strong>{byId.get(pair.slots.evening)?.name}</strong>
            <small>저녁</small>
          </span>
        </div>
      ) : null}
    </article>
  );
}

function CollapsedCard({
  state,
  onPick,
}: {
  state: CombinationState;
  onPick: (id: string) => void;
}) {
  const labels = [...new Set(state.cautionPairs.flatMap((pair) => pair.ingredientLabels))];
  return (
    <article className="combination-card combination-collapsed">
      <div className="combination-card-head">
        <h3>오늘은 이 중 하나만 골라 주세요</h3>
      </div>
      <p className="combination-reason">
        {labels.join(' · ')}는 서로 겹치면 자극이 커져요. 고른 제품만 오늘 안내에 남고, 나머지는
        내일 다시 올라와요.
      </p>
      <ProductChoices
        products={state.affectedProducts}
        selectedProductId={state.selectedProductId}
        onPick={onPick}
      />
    </article>
  );
}

export function CombinationGroup({ variant, state, day, onPick }: CombinationGroupProps) {
  const cautionPairs = state.cautionPairs;
  const okPairs =
    variant === 'group' ? state.okPairs.filter((pair) => day === pair.activeFromD) : [];
  if (!cautionPairs.length && !okPairs.length) return null;

  return (
    <section className={`combination-group ${variant}`} aria-label="함께 쓸 때">
      {variant === 'group' ? (
        <div className="combination-group-head" id="combination">
          <h2>함께 쓸 때</h2>
          <span>
            제품{' '}
            {state.affectedProducts.length ||
              new Set(okPairs.flatMap((p) => p.products.map((product) => product.productId))).size}
            개
          </span>
        </div>
      ) : null}
      <div className="combination-card-list">
        {variant === 'sheet' && state.isCollapsed && cautionPairs.length ? (
          <CollapsedCard state={state} onPick={onPick} />
        ) : (
          cautionPairs.map((pair) => (
            <CombinationCard
              pair={pair}
              selectedProductId={state.selectedProductId}
              onPick={onPick}
              key={pair.pairId}
            />
          ))
        )}
        {okPairs.map((pair) => (
          <CombinationCard
            pair={pair}
            selectedProductId={state.selectedProductId}
            onPick={onPick}
            key={pair.pairId}
          />
        ))}
      </div>
    </section>
  );
}

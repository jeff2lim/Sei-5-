import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CombinationState } from '@/ruletable/types';
import { CombinationGroup } from './combination-group';
import { CombinationStrip } from './combination-strip';

const products = [
  { productId: 'vit-c', name: '비타민C 앰플', category: 'skincare' as const },
  { productId: 'retinol', name: '레티놀 크림', category: 'skincare' as const },
  { productId: 'acid', name: '각질 토너', category: 'skincare' as const },
];

const collapsedState: CombinationState = {
  cautionPairs: [
    {
      pairId: 'vitamin_c__retinoid',
      relation: 'separate_days',
      ingredientLabels: ['비타민C', '레티노이드'],
      products: products.slice(0, 2),
      userText: '오늘은 둘 중 하나만',
      reasonText: '같은 날 겹치면 자극이 커져요',
      activeFromD: 11,
    },
    {
      pairId: 'vitamin_c__exfoliating_acid',
      relation: 'separate_time',
      ingredientLabels: ['비타민C', 'AHA · BHA'],
      products: [products[0], products[2]],
      userText: '아침과 저녁',
      reasonText: '같은 시간에 겹치면 따가울 수 있어요',
      activeFromD: 12,
      slots: { morning: 'vit-c', evening: 'acid' },
    },
    {
      pairId: 'retinoid__exfoliating_acid',
      relation: 'separate_days',
      ingredientLabels: ['레티노이드', 'AHA · BHA'],
      products: products.slice(1),
      userText: '오늘은 둘 중 하나만',
      reasonText: '같은 날 겹치면 자극이 커져요',
      activeFromD: 12,
    },
  ],
  okPairs: [],
  affectedProducts: products,
  isCollapsed: true,
  selectedProductId: null,
};

describe('combination UI', () => {
  it('shows one strip with the affected-product count', () => {
    render(<CombinationStrip state={collapsedState} onOpen={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveTextContent('함께 쓸 때 확인할 제품');
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByText('비타민C')).not.toBeInTheDocument();
  });

  it('renders one collapsed card and keeps selection as a radio action', () => {
    const onPick = vi.fn();
    const { container } = render(
      <CombinationGroup variant="sheet" state={collapsedState} day={12} onPick={onPick} />,
    );
    expect(container.querySelectorAll('.combination-card')).toHaveLength(1);
    const choice = screen.getByRole('radio', { name: /비타민C 앰플/ });
    expect(choice).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(choice);
    expect(onPick).toHaveBeenCalledWith('vit-c');
  });

  it('does not render a strip for ok-only pairs', () => {
    const okState: CombinationState = {
      ...collapsedState,
      cautionPairs: [],
      affectedProducts: [],
      isCollapsed: false,
      okPairs: [
        {
          pairId: 'niacinamide__vitamin_c',
          relation: 'no_restriction',
          ingredientLabels: ['나이아신아마이드', '비타민C'],
          products: products.slice(0, 2),
          userText: '같이 써도 괜찮아요',
          reasonText: '서로 방해하지 않아요',
          activeFromD: 7,
        },
      ],
    };
    const { container } = render(<CombinationStrip state={okState} onOpen={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

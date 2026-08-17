'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { CombinationSheet } from '@/components/combinations/combination-sheet';
import { CombinationStrip } from '@/components/combinations/combination-strip';
import { useCombinationPick } from '@/components/combinations/use-combination-pick';
import { LoadingScreen } from '@/components/common/loading-screen';
import { Topbar } from '@/components/common/topbar';
import { ProductRow } from '@/components/products/product-row';
import { analytics } from '@/domain/analytics';
import type { ProductCategory } from '@/domain/product';
import { getProcedureDay } from '@/domain/procedure';
import { evaluateProduct } from '@/rules/engine/evaluate';
import {
  combinationsForCategory,
  resolveCombinationState,
  toCombinationUiProduct,
} from '@/ruletable/combine';
import { getNextProcedureDay } from '@/ruletable/date';
import { activeBehaviorWarnings } from '@/ruletable/resolve';
import { useRecoveryStore } from '@/store/recovery-store';
import { ChevronLeft, ChevronRight, Info, PackagePlus } from 'lucide-react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const content = {
  cleansing: {
    title: '세안',
    headline: '문지르는 시간을 줄이고 미온수로 짧게 마무리해요.',
    guidance: '거품을 충분히 낸 뒤 손끝 압력을 줄여 세안하세요. 스크럽·필링은 사용하지 마세요.',
  },
  skincare: {
    title: '스킨케어',
    headline: '보습 중심으로 단순하게 사용해요.',
    guidance: '한 번에 여러 제품을 겹치기보다 따가움이나 붉음이 없는지 하나씩 확인하세요.',
  },
  outing: {
    title: '외출준비',
    headline: '자외선 차단은 계속하고 마찰은 줄여요.',
    guidance: '문지름이 적은 제형을 얇게 바르고, 모자나 양산 같은 물리적 차단을 함께 활용하세요.',
  },
} satisfies Record<ProductCategory, { title: string; headline: string; guidance: string }>;

const guideOrder: ProductCategory[] = ['cleansing', 'skincare', 'outing'];

export default function GuidePage() {
  const params = useParams<{ category: string }>();
  const category = params.category as ProductCategory;
  if (!(category in content)) notFound();
  const currentIndex = guideOrder.indexOf(category);
  const previousCategory = currentIndex > 0 ? guideOrder[currentIndex - 1] : null;
  const nextCategory = currentIndex < guideOrder.length - 1 ? guideOrder[currentIndex + 1] : null;
  const hydrated = useRecoveryStore((state) => state.hydrated);
  const session = useRecoveryStore((state) => state.session);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showPickToast, setShowPickToast] = useState(false);
  const stripRef = useRef<HTMLButtonElement>(null);
  const day = session?.procedure ? getProcedureDay(session.procedure.performedAt, new Date()) : 0;
  const nextProcedureDay = getNextProcedureDay(
    session?.procedure?.performedAt,
    session?.profile.nextProcedureAt,
  );
  const { selectedProductId, selectProduct } = useCombinationPick(session?.procedure?.id, day);
  const allDetails = (session?.products ?? []).map((product) => ({
    product,
    verdict: evaluateProduct(
      product,
      day,
      session?.profile.sensitivity ?? 'normal',
      nextProcedureDay,
    ),
  }));
  const details = allDetails.filter(({ product }) => product.category === category);
  const latestCheckIn = [...(session?.checkIns ?? [])]
    .filter((checkIn) => checkIn.procedureDay === day)
    .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))[0];
  const combinationState = resolveCombinationState({
    day,
    sensitivity: session?.profile.sensitivity ?? 'normal',
    userProducts: allDetails.map(({ product, verdict }) =>
      toCombinationUiProduct(product, verdict.level),
    ),
    symptoms: latestCheckIn?.answers.map((answer) => ({
      id: answer.symptomId,
      present: answer.present,
      severity: answer.severity,
    })),
    nextProcedureDay,
    selectedProductId,
  });
  const categoryCombinationState = combinationsForCategory(combinationState, category);
  const warnings = activeBehaviorWarnings(day, category);

  const pickProduct = useCallback(
    (productId: string) => {
      const isFirstPick = selectedProductId === null;
      selectProduct(productId);
      if (isFirstPick) {
        setShowPickToast(true);
        window.setTimeout(() => setShowPickToast(false), 2600);
      }
    },
    [selectProduct, selectedProductId],
  );
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  useEffect(() => {
    analytics.track({ name: 'category_guide_viewed', category });
  }, [category]);

  if (!hydrated) return <LoadingScreen />;

  return (
    <AppShell>
      <Topbar title={content[category].title} closeHref="/home" />

      <nav className="guide-pager" aria-label="행동안내 이동">
        {previousCategory ? (
          <Link
            className="icon-button"
            href={`/guide/${previousCategory}`}
            aria-label={`${content[previousCategory].title}으로 이동`}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </Link>
        ) : (
          <span className="guide-pager-disabled" aria-hidden="true">
            <ChevronLeft size={20} />
          </span>
        )}

        <div className="guide-pager-label">
          <strong>{content[category].title}</strong>
          <span>
            {currentIndex + 1} / {guideOrder.length}
          </span>
        </div>

        {nextCategory ? (
          <Link
            className="icon-button"
            href={`/guide/${nextCategory}`}
            aria-label={`${content[nextCategory].title}으로 이동`}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </Link>
        ) : (
          <span className="guide-pager-disabled" aria-hidden="true">
            <ChevronRight size={20} />
          </span>
        )}
      </nav>

      <div className="verdict-panel unknown">
        <span className="badge">D+{day} 일반 안내</span>
        <h2>{content[category].headline}</h2>
        <p>{content[category].guidance}</p>
      </div>

      <section className="section">
        <h2 className="section-title">내 {content[category].title} 제품</h2>
        {details.length ? (
          <div className="card">
            {details.map(({ product, verdict }) => {
              const affected = categoryCombinationState.affectedProducts.some(
                (candidate) => candidate.productId === product.id,
              );
              const combinationLabel = selectedProductId
                ? product.id === selectedProductId
                  ? 'today'
                  : affected
                    ? 'tomorrow'
                    : null
                : null;
              return (
                <ProductRow
                  product={product}
                  verdict={verdict}
                  combinationLabel={combinationLabel}
                  key={product.id}
                />
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <PackagePlus size={30} aria-hidden="true" />
            <h2>등록된 제품이 없어요</h2>
            <p>일반 안내는 확인할 수 있고, 제품은 나중에 추가해도 돼요.</p>
            <Link className="button secondary" href="/products/new/category">
              제품 등록
            </Link>
          </div>
        )}
      </section>

      <div className="notice section">
        <Info size={18} aria-hidden="true" />
        <span>
          판정 정보가 없는 제품은 안전하다는 뜻이 아니라, 현재 룰이 연결되지 않은 상태입니다.
        </span>
      </div>
      {warnings.length ? (
        <section className="section stack" aria-label="오늘의 행동 안내">
          {warnings.map((warning) => (
            <div className="notice" key={warning.id}>
              <Info size={18} aria-hidden="true" />
              <span>{warning.text}</span>
            </div>
          ))}
        </section>
      ) : null}

      <CombinationStrip
        state={categoryCombinationState}
        onOpen={() => setSheetOpen(true)}
        ref={stripRef}
      />

      <div
        className="guide-pager-dots"
        aria-label={`${currentIndex + 1} / ${guideOrder.length} 단계`}
      >
        {guideOrder.map((item, index) => (
          <Link
            key={item}
            href={`/guide/${item}`}
            className={index === currentIndex ? 'active' : undefined}
            aria-label={`${content[item].title}으로 이동`}
            aria-current={index === currentIndex ? 'page' : undefined}
          />
        ))}
      </div>

      <CombinationSheet
        open={sheetOpen}
        state={categoryCombinationState}
        day={day}
        onClose={closeSheet}
        onPick={pickProduct}
        returnFocusRef={stripRef}
      />
      {showPickToast ? (
        <div className="combination-toast" role="status">
          판정이 바뀐 건 아니에요. 오늘 순서만 정한 거예요.
        </div>
      ) : null}
    </AppShell>
  );
}

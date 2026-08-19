'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { Topbar } from '@/components/common/topbar';
import type { UserProfile } from '@/domain/procedure';
import { useSubmitState } from '@/hooks/use-submit-state';
import { useRecoveryStore } from '@/store/recovery-store';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CleansingPage() {
  const router = useRouter();
  const session = useRecoveryStore((state) => state.session);
  const saveProfile = useRecoveryStore((state) => state.saveProfile);
  const [feel, setFeel] = useState<UserProfile['cleansingFeel']>(
    session?.profile.cleansingFeel ?? 'unknown',
  );
  const { submitting, errorMessage: submitError, run } = useSubmitState({
    context: 'cleansing',
  });

  async function submit() {
    await run(async () => {
      await saveProfile({
        ...(session?.profile ?? { sensitivity: 'normal' }),
        cleansingFeel: feel,
      }, 'complete');
      router.push('/onboarding/complete');
    });
  }

  return (
    <AppShell navigation={false}>
      <Topbar title="세안 느낌" />
      <div className="progress" aria-label="4단계 중 3단계">
        <span className="done" />
        <span className="done" />
        <span className="active" />
        <span />
      </div>
      <p className="eyebrow">Step 3 · Cleansing</p>
      <h1 className="headline">세안 후 피부 느낌은 어떤가요?</h1>
      <p className="subcopy">제품마다 묻지 않고 한 번만 기록해요. 원하면 건너뛸 수 있어요.</p>
      <fieldset className="section choice-grid">
        <legend className="sr-only">세안 후 피부 느낌</legend>
        {[
          ['comfortable', '편안해요', '당기거나 불편한 느낌이 거의 없어요.'],
          ['tight', '당기는 편이에요', '세안 후 건조하거나 팽팽한 느낌이 있어요.'],
          ['unknown', '잘 모르겠어요', '선택하지 않은 상태로 계속할게요.'],
        ].map(([value, label, description]) => (
          <label className="choice" key={value}>
            <strong>{label}</strong>
            <span>{description}</span>
            <input
              type="radio"
              name="cleansingFeel"
              checked={feel === value}
              onChange={() => setFeel(value as UserProfile['cleansingFeel'])}
            />
          </label>
        ))}
      </fieldset>
      <div className="sticky-actions">
        {submitError ? (
          <p className="error" role="alert">
            {submitError}
          </p>
        ) : null}
        <button
          className="button full"
          type="button"
          aria-busy={submitting}
          disabled={submitting}
          onClick={() => void submit()}
        >
          {submitting ? '저장 중…' : '다음'}
        </button>
      </div>
    </AppShell>
  );
}

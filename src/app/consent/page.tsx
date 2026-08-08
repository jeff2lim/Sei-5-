'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { LoadingScreen } from '@/components/common/loading-screen';
import { Topbar } from '@/components/common/topbar';
import type { ConsentState } from '@/domain/session';
import { useRecoveryStore } from '@/store/recovery-store';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type ConsentKey = 'terms' | 'privacy' | 'healthData' | 'photo' | 'marketing';

const consentItems: Array<{
  key: ConsentKey;
  title: string;
  description: string;
  required: boolean;
  href?: string;
}> = [
  {
    key: 'terms',
    title: '서비스 이용약관',
    description: '서비스 제공과 이용 조건',
    required: true,
    href: '/legal/terms',
  },
  {
    key: 'privacy',
    title: '개인정보 수집·이용',
    description: '시술일, 제품 속성, 체크 기록 · 서비스 이용 중 보유',
    required: true,
    href: '/legal/privacy',
  },
  {
    key: 'healthData',
    title: '건강 관련 입력정보 처리',
    description: '피부 상태 체크 · 기능 제공과 기록을 위해 별도 처리',
    required: true,
  },
  {
    key: 'photo',
    title: '사진 저장',
    description: '기본 비활성화 · 분석하지 않음',
    required: false,
  },
  {
    key: 'marketing',
    title: '제품 추천·마케팅 알림',
    description: '추천 영역과 알림 수신',
    required: false,
  },
];

const CONSENT_DRAFT_KEY = 'recovery-note:consent-draft';

const emptyConsentValues: Record<ConsentKey, boolean> = {
  terms: false,
  privacy: false,
  healthData: false,
  photo: false,
  marketing: false,
};

export default function ConsentPage() {
  const router = useRouter();
  const hydrated = useRecoveryStore((state) => state.hydrated);
  const session = useRecoveryStore((state) => state.session);
  const saveConsent = useRecoveryStore((state) => state.saveConsent);

  const [consentMode, setConsentMode] = useState<'onboarding' | 'edit' | null>(null);
  const isEditing = consentMode === 'edit';
  const [values, setValues] = useState<Record<ConsentKey, boolean>>(emptyConsentValues);
  const [draftLoaded, setDraftLoaded] = useState(false);
  useEffect(() => {
    if (!hydrated || draftLoaded) return;

    const mode =
      new URLSearchParams(window.location.search).get('mode') === 'edit' ? 'edit' : 'onboarding';

    setConsentMode(mode);

    if (mode === 'onboarding') {
      const raw = window.sessionStorage.getItem(CONSENT_DRAFT_KEY);

      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<Record<ConsentKey, unknown>>;

          setValues({
            terms: saved.terms === true,
            privacy: saved.privacy === true,
            healthData: saved.healthData === true,
            photo: saved.photo === true,
            marketing: saved.marketing === true,
          });
          setDraftLoaded(true);
          return;
        } catch {
          window.sessionStorage.removeItem(CONSENT_DRAFT_KEY);
        }
      }
    }
    if (session?.consent) {
      setValues({
        terms: session.consent.terms,
        privacy: session.consent.privacy,
        healthData: session.consent.healthData,
        photo: session.consent.photo,
        marketing: session.consent.marketing,
      });
    } else {
      setValues(emptyConsentValues);
    }

    setDraftLoaded(true);
  }, [draftLoaded, hydrated, session?.consent]);

  useEffect(() => {
    if (!draftLoaded || consentMode !== 'onboarding') return;

    window.sessionStorage.setItem(CONSENT_DRAFT_KEY, JSON.stringify(values));
  }, [consentMode, draftLoaded, values]);
  const requiredComplete = values.terms && values.privacy && values.healthData;

  function toggleAll() {
    const next = !consentItems.every((item) => values[item.key]);
    setValues({ terms: next, privacy: next, healthData: next, photo: next, marketing: next });
  }

  function discardConsentDraft() {
    window.sessionStorage.removeItem(CONSENT_DRAFT_KEY);
  }

  async function submit() {
    if (!requiredComplete) return;
    const consent: ConsentState = { ...values, updatedAt: new Date().toISOString() };
    await saveConsent(consent);
    window.sessionStorage.removeItem(CONSENT_DRAFT_KEY);
    router.push(isEditing ? '/profile' : '/onboarding/procedure');
  }

  if (!hydrated || !draftLoaded || consentMode === null) {
    return <LoadingScreen navigation={false} />;
  }

  return (
    <AppShell navigation={false}>
      <Topbar
        title={isEditing ? '동의 내역' : '동의 안내'}
        closeHref={isEditing ? '/profile' : '/?showLanding=1'}
        onClose={discardConsentDraft}
      />
      <p className="eyebrow">Before we start</p>
      <h1 className="headline">필요한 동의를 하나씩 확인해 주세요.</h1>
      <p className="subcopy">선택 동의는 거부해도 핵심 기능을 사용할 수 있어요.</p>

      <section className="section stack">
        <label className="choice">
          <strong>전체 동의</strong>
          <span>필수와 선택 항목을 모두 선택합니다.</span>
          <input
            type="checkbox"
            checked={consentItems.every((item) => values[item.key])}
            onChange={toggleAll}
          />
        </label>
        {consentItems.map((item) => (
          <div className="card" key={item.key} style={{ padding: 14 }}>
            <label className="list-row" style={{ border: 0, padding: 0 }}>
              <input
                type="checkbox"
                checked={values[item.key]}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [item.key]: event.target.checked }))
                }
                style={{ width: 20, height: 20, accentColor: 'var(--teal)' }}
              />
              <span className="list-row-main" style={{ flex: 1 }}>
                <strong>
                  {item.required ? '[필수]' : '[선택]'} {item.title}
                </strong>
                <span>{item.description}</span>
              </span>
              {item.href ? (
                <Link
                  className="icon-button"
                  href={item.href}
                  aria-label={`${item.title} 전문 보기`}
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </Link>
              ) : null}
            </label>
          </div>
        ))}
      </section>

      <div className="notice section">
        <ShieldCheck size={19} aria-hidden="true" />
        <span>
          동의를 거부하면 해당 선택 기능만 제한됩니다. 동의 내역은 마이에서 확인할 수 있어요.
        </span>
      </div>

      <div className="sticky-actions">
        <button className="button full" type="button" disabled={!requiredComplete} onClick={submit}>
          {isEditing ? '동의 내역 저장' : '동의하고 계속'}
        </button>
      </div>
    </AppShell>
  );
}

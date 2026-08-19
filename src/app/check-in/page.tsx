'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { Topbar } from '@/components/common/topbar';
import { analytics } from '@/domain/analytics';
import type { CheckIn, CheckInAnswer } from '@/domain/check-in';
import { getProcedureDay } from '@/domain/procedure';
import { useSubmitState } from '@/hooks/use-submit-state';
import { isAuthEnabled } from '@/lib/supabase/config';
import { evaluateCheckIn } from '@/rules/engine/evaluate';
import { symptomDefinitions } from '@/ruletable/data';
import { v6RuleTable } from '@/ruletable/resolve';
import { useRecoveryStore } from '@/store/recovery-store';
import { AlertTriangle, CameraOff, Info } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

const severityOptions = [
  { value: 1 as const, label: '약간' },
  { value: 2 as const, label: '보통' },
  { value: 3 as const, label: '심함' },
];

export default function CheckInPage() {
  const router = useRouter();
  const session = useRecoveryStore((state) => state.session);
  const saveCheckIn = useRecoveryStore((state) => state.saveCheckIn);
  const [answers, setAnswers] = useState<Record<string, CheckInAnswer>>({});
  const {
    submitting: saving,
    errorMessage: saveError,
    run,
    showError,
  } = useSubmitState({
    context: 'check_in',
    fallbackMessage: '기록을 저장하지 못했어요. 선택한 내용은 이 화면에 그대로 있어요.',
  });
  const pendingCheckInRef = useRef<CheckIn | null>(null);

  function toggle(id: string, present: boolean, withSeverity: boolean) {
    pendingCheckInRef.current = null;
    setAnswers((current) => ({
      ...current,
      [id]: { symptomId: id, present, severity: present && withSeverity ? 1 : undefined },
    }));
  }

  function setSeverity(id: string, severity: 1 | 2 | 3) {
    pendingCheckInRef.current = null;
    setAnswers((current) => ({
      ...current,
      [id]: { symptomId: id, present: true, severity },
    }));
  }

  async function submit() {
    const procedure = session?.procedure;
    if (!procedure) {
      showError('시술 기록이 없어서 저장할 수 없어요. 시술일을 먼저 입력해 주세요.');
      return;
    }

    await run(async () => {
      const procedureDay = getProcedureDay(procedure.performedAt, new Date());
      const checkIn =
        pendingCheckInRef.current ??
        ({
          id: crypto.randomUUID(),
          checkedAt: new Date().toISOString(),
          procedureDay,
          answers: Object.values(answers),
          rulePackVersion: v6RuleTable.version,
        } satisfies CheckIn);
      pendingCheckInRef.current = checkIn;
      const action = evaluateCheckIn(checkIn);
      await saveCheckIn(checkIn);
      pendingCheckInRef.current = null;
      analytics.track({
        name: 'check_in_completed',
        selectedSymptomCount: checkIn.answers.filter((answer) => answer.present).length,
        action: action.type,
      });
      router.push('/check-in/result');
    });
  }

  return (
    <AppShell navigation={false}>
      <Topbar title="오늘 피부 상태 체크" closeHref="/home" />
      <p className="eyebrow">Daily check-in</p>
      <h1 className="headline">오늘 보이는 변화를 직접 선택해 주세요.</h1>
      <p className="subcopy">정상적인 회복 경과와 병원 확인 신호를 나누어 기록합니다.</p>

      <section className="section">
        <h2 className="section-title">A. 회복 경과</h2>
        <p className="subcopy">있는 항목만 선택하고 느껴지는 정도를 알려주세요.</p>
        <fieldset className="stack">
          <legend className="sr-only">회복 경과 항목</legend>
          {symptomDefinitions.section_a.map((symptom) => {
            const answer = answers[symptom.id];
            return (
              <div className="card" key={symptom.id}>
                <div className="list-row" style={{ paddingTop: 0 }}>
                  <div className="list-row-main">
                    <strong>{symptom.label}</strong>
                    <span>{symptom.description}</span>
                  </div>
                </div>
                <div className="segmented" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    aria-pressed={answer?.present === false}
                    onClick={() => toggle(symptom.id, false, true)}
                  >
                    없어요
                  </button>
                  <button
                    type="button"
                    aria-pressed={answer?.present === true}
                    onClick={() => toggle(symptom.id, true, true)}
                  >
                    있어요
                  </button>
                </div>
                {answer?.present ? (
                  <div
                    className="segmented"
                    style={{ marginTop: 10 }}
                    aria-label={`${symptom.label} 강도`}
                  >
                    {severityOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={answer.severity === option.value}
                        onClick={() => setSeverity(symptom.id, option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                {symptom.id === 'breakout' && answer?.present && answer.severity === 3 ? (
                  <div className="notice" style={{ marginTop: 12 }}>
                    <Info size={18} aria-hidden="true" />
                    <span>
                      곪거나 진물이 나나요?{' '}
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => toggle('discharge_pus', true, false)}
                      >
                        예
                      </button>
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </fieldset>
      </section>

      <section className="section card" style={{ borderColor: 'var(--danger)' }}>
        <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={20} aria-hidden="true" /> B. 이런 게 있나요?
        </h2>
        <p className="subcopy">
          이 항목은 항상 확인해 주세요. 선택하면 병원 확인 안내가 표시됩니다.
        </p>
        <fieldset className="stack">
          <legend className="sr-only">경고 신호</legend>
          {symptomDefinitions.section_b.map((symptom) => {
            const answer = answers[symptom.id];
            return (
              <label className="choice" key={symptom.id}>
                <strong>{symptom.label}</strong>
                <span>
                  {symptom.urgency === 'contact_now' ? '가능하면 바로 병원 확인' : '병원 확인 권장'}
                </span>
                <input
                  type="checkbox"
                  checked={answer?.present === true}
                  onChange={(event) => toggle(symptom.id, event.target.checked, false)}
                />
              </label>
            );
          })}
        </fieldset>
      </section>

      <div className="notice section">
        <CameraOff size={18} aria-hidden="true" />
        <span>사진 업로드는 비활성화되어 있으며 이 앱은 사진을 분석하지 않습니다.</span>
      </div>

      <div className="sticky-actions">
        {saveError ? (
          <div className="stack" role="alert">
            <p className="error">{saveError}</p>
            {isAuthEnabled() ? (
              <p className="subcopy">
                같은 문제가 계속되면 이 화면을 닫지 말고 새 창에서{' '}
                <Link
                  href="/auth/login?next=/check-in&placement=check_in_save_error"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  카카오 로그인
                </Link>
                후 다시 저장해 보세요.
              </p>
            ) : null}
          </div>
        ) : null}
        <button
          className="button full"
          type="button"
          aria-busy={saving}
          disabled={saving}
          onClick={() => void submit()}
        >
          {saving ? '저장 중…' : '체크 완료'}
        </button>
      </div>
    </AppShell>
  );
}

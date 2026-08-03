'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { Topbar } from '@/components/common/topbar';
import { evaluateCheckIn } from '@/rules/engine/evaluate';
import { bundledRulePack } from '@/rules/loaders/bundled-rule-pack';
import { analytics } from '@/domain/analytics';
import type { CheckIn, CheckInAnswer } from '@/domain/check-in';
import { useRecoveryStore } from '@/store/recovery-store';
import { CameraOff, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const symptoms = [
  { id: 'redness', label: '붉음', description: '붉은 범위가 넓어지거나 진해졌어요.' },
  { id: 'swelling', label: '붓기', description: '붓기가 새로 생기거나 심해졌어요.' },
  { id: 'blister', label: '수포', description: '물집처럼 보이는 변화가 있어요.' },
  { id: 'pain', label: '통증', description: '새 통증이 있거나 통증이 심해졌어요.' },
  { id: 'heat', label: '열감', description: '평소보다 뜨겁게 느껴지는 부분이 있어요.' },
];

export default function CheckInPage() {
  const router = useRouter();
  const saveCheckIn = useRecoveryStore((state) => state.saveCheckIn);
  const [answers, setAnswers] = useState<Record<string, CheckInAnswer>>({});
  const [saving, setSaving] = useState(false);

  function toggle(id: string, present: boolean) {
    setAnswers((current) => ({
      ...current,
      [id]: { symptomId: id, present, severity: present ? 'mild' : undefined },
    }));
  }

  async function submit() {
    setSaving(true);
    const checkIn: CheckIn = {
      id: crypto.randomUUID(),
      checkedAt: new Date().toISOString(),
      answers: symptoms.map(
        (symptom) => answers[symptom.id] ?? { symptomId: symptom.id, present: false },
      ),
      rulePackVersion: bundledRulePack.meta.version,
    };
    const action = evaluateCheckIn(checkIn, bundledRulePack);
    await saveCheckIn(checkIn);
    analytics.track({
      name: 'check_in_completed',
      selectedSymptomCount: checkIn.answers.filter((answer) => answer.present).length,
      action: action.type,
    });
    router.push('/check-in/result');
  }

  return (
    <AppShell navigation={false}>
      <Topbar title="오늘 피부 상태 체크" closeHref="/home" />
      <p className="eyebrow">Daily check-in</p>
      <h1 className="headline">오늘 보이는 변화를 직접 선택해 주세요.</h1>
      <p className="subcopy">입력 내용에서 정해진 행동 안내 하나를 보여 드립니다.</p>
      <fieldset className="section stack">
        <legend className="sr-only">피부 상태 항목</legend>
        {symptoms.map((symptom) => {
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
                  onClick={() => toggle(symptom.id, false)}
                >
                  없어요
                </button>
                <button
                  type="button"
                  aria-pressed={answer?.present === true}
                  onClick={() => toggle(symptom.id, true)}
                >
                  있어요
                </button>
              </div>
              {answer?.present ? (
                <div className="field" style={{ marginTop: 12 }}>
                  <label htmlFor={`${symptom.id}-severity`}>느껴지는 정도</label>
                  <select
                    id={`${symptom.id}-severity`}
                    value={answer.severity}
                    onChange={(event) =>
                      setAnswers((current) => ({
                        ...current,
                        [symptom.id]: {
                          ...current[symptom.id],
                          severity: event.target.value as CheckInAnswer['severity'],
                        },
                      }))
                    }
                  >
                    <option value="mild">가벼움</option>
                    <option value="moderate">중간</option>
                    <option value="severe">심함</option>
                  </select>
                </div>
              ) : null}
            </div>
          );
        })}
      </fieldset>

      <div className="notice section">
        <CameraOff size={18} aria-hidden="true" />
        <span>사진 업로드는 현재 비활성화되어 있습니다. 이 앱은 사진을 분석하지 않습니다.</span>
      </div>
      <div className="notice" style={{ marginTop: 10 }}>
        <Info size={18} aria-hidden="true" />
        <span>호흡곤란, 의식 변화 등 긴급한 증상이 있으면 앱을 사용하지 말고 119 또는 응급실을 이용하세요.</span>
      </div>

      <div className="sticky-actions">
        <button className="button full" type="button" disabled={saving} onClick={submit}>
          체크 완료
        </button>
      </div>
    </AppShell>
  );
}

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AppShell } from '@/components/app-shell/app-shell';
import { Topbar } from '@/components/common/topbar';
import type { Sensitivity } from '@/domain/procedure';
import { analytics } from '@/domain/analytics';
import { getProcedureDay, toLocalDateInputValue } from '@/domain/procedure';
import { useRecoveryStore } from '@/store/recovery-store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const today = () => toLocalDateInputValue(new Date());
const formSchema = z.object({
  performedAt: z.string().min(1, '시술 날짜를 선택해 주세요.'),
  sensitivity: z.enum(['low', 'normal', 'high']),
});
type FormValues = z.infer<typeof formSchema>;

export default function ProcedurePage() {
  const router = useRouter();
  const saveProcedure = useRecoveryStore((state) => state.saveProcedure);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { performedAt: today(), sensitivity: 'normal' },
  });

  useEffect(() => analytics.track({ name: 'onboarding_started' }), []);

  async function submit(values: FormValues) {
    if (values.performedAt > today()) {
      form.setError('performedAt', { message: '시술 날짜는 미래일 수 없어요.' });
      return;
    }
    await saveProcedure(values.performedAt, values.sensitivity as Sensitivity);
    analytics.track({
      name: 'procedure_saved',
      procedureDay: getProcedureDay(values.performedAt, new Date()),
    });
    router.push('/onboarding/products');
  }

  return (
    <AppShell navigation={false}>
      <Topbar title="시술 기록" closeHref="/" />
      <div className="progress" aria-label="4단계 중 1단계">
        <span className="active" />
        <span />
        <span />
        <span />
      </div>
      <p className="eyebrow">Step 1 · Procedure</p>
      <h1 className="headline">피코토닝 시술일을 알려 주세요.</h1>
      <p className="subcopy">날짜를 기준으로 D+n 안내가 달라져요.</p>

      <form className="section stack" onSubmit={form.handleSubmit(submit)} noValidate>
        <div className="field">
          <label htmlFor="performedAt">시술 날짜</label>
          <input
            id="performedAt"
            type="date"
            max={today()}
            aria-invalid={Boolean(form.formState.errors.performedAt)}
            aria-describedby="performedAt-error"
            {...form.register('performedAt')}
          />
          {form.formState.errors.performedAt ? (
            <p className="error" id="performedAt-error" role="alert">
              {form.formState.errors.performedAt.message}
            </p>
          ) : null}
        </div>

        <fieldset className="field choice-grid">
          <legend>평소 피부 민감도</legend>
          {[
            ['low', '낮은 편', '대체로 편안하게 사용해요.'],
            ['normal', '보통', '잘 모르겠다면 그대로 선택하세요.'],
            ['high', '민감한 편', '제품에 따가움이나 붉음이 자주 있어요.'],
          ].map(([value, label, description]) => (
            <label className="choice" key={value}>
              <strong>{label}</strong>
              <span>{description}</span>
              <input type="radio" value={value} {...form.register('sensitivity')} />
            </label>
          ))}
        </fieldset>

        <div className="sticky-actions">
          <button className="button full" type="submit" disabled={form.formState.isSubmitting}>
            다음
          </button>
        </div>
      </form>
    </AppShell>
  );
}

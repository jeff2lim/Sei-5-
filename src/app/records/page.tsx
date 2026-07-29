'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { LoadingScreen } from '@/components/common/loading-screen';
import { useRecoveryStore } from '@/store/recovery-store';
import { CalendarPlus, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';

export default function RecordsPage() {
  const hydrated = useRecoveryStore((state) => state.hydrated);
  const session = useRecoveryStore((state) => state.session);
  const saveProfile = useRecoveryStore((state) => state.saveProfile);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [nextDate, setNextDate] = useState(session?.profile.nextProcedureAt ?? '');
  if (!hydrated) return <LoadingScreen />;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const dayCount = new Date(year, month + 1, 0).getDate();
  const checkedDays = new Set(
    (session?.checkIns ?? [])
      .filter((item) => {
        const date = new Date(item.checkedAt);
        return date.getFullYear() === year && date.getMonth() === month;
      })
      .map((item) => new Date(item.checkedAt).getDate()),
  );
  const procedureDay = session?.procedure ? Number(session.procedure.performedAt.slice(8, 10)) : null;
  const nextProcedureDay =
    session?.profile.nextProcedureAt?.slice(0, 7) ===
    `${year}-${String(month + 1).padStart(2, '0')}`
      ? Number(session.profile.nextProcedureAt.slice(8, 10))
      : null;

  async function saveNextDate(event: React.FormEvent) {
    event.preventDefault();
    await saveProfile({
      ...(session?.profile ?? { sensitivity: 'normal' }),
      nextProcedureAt: nextDate || undefined,
    });
    dialogRef.current?.close();
  }

  return (
    <AppShell>
      <header>
        <p className="eyebrow">Recovery records</p>
        <h1 className="headline">기록</h1>
        <p className="subcopy">피부 체크를 완료한 날과 시술 일정을 모아 봅니다.</p>
      </header>

      <section className="section card">
        <div className="list-row" style={{ paddingTop: 0 }}>
          <strong>
            {year}년 {month + 1}월
          </strong>
          <button
            className="button secondary"
            type="button"
            onClick={() => dialogRef.current?.showModal()}
          >
            <CalendarPlus size={17} aria-hidden="true" /> 일정 추가
          </button>
        </div>
        <div className="calendar" aria-label={`${year}년 ${month + 1}월 달력`}>
          {'일월화수목금토'.split('').map((day) => (
            <span key={day} style={{ color: 'var(--ink-soft)', fontWeight: 700 }}>
              {day}
            </span>
          ))}
          {Array.from({ length: new Date(year, month, 1).getDay() }, (_, index) => (
            <span key={`blank-${index}`} />
          ))}
          {Array.from({ length: dayCount }, (_, index) => index + 1).map((day) => (
            <span
              key={day}
              className={
                day === procedureDay || day === nextProcedureDay
                  ? 'procedure'
                  : checkedDays.has(day)
                    ? 'checked'
                    : undefined
              }
              aria-label={`${month + 1}월 ${day}일${
                day === procedureDay
                  ? ', 시술일'
                  : day === nextProcedureDay
                    ? ', 다음 시술 예정'
                    : checkedDays.has(day)
                      ? ', 체크 완료'
                      : ''
              }`}
            >
              {day}
            </span>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">체크 기록</h2>
        {session?.checkIns.length ? (
          <div className="card">
            {[...session.checkIns].reverse().map((checkIn) => (
              <Link className="list-row" href="/check-in/result" key={checkIn.id}>
                <span className="list-row-main">
                  <strong>
                    {new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(
                      new Date(checkIn.checkedAt),
                    )}
                  </strong>
                  <span>
                    선택 항목 {checkIn.answers.filter((answer) => answer.present).length}개 · 룰팩{' '}
                    {checkIn.rulePackVersion}
                  </span>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>아직 체크 기록이 없어요</h2>
            <p>오늘 상태를 체크하면 이곳에 날짜별로 남아요.</p>
            <Link className="button" href="/check-in">
              첫 체크 시작
            </Link>
          </div>
        )}
      </section>

      <dialog
        ref={dialogRef}
        aria-labelledby="schedule-title"
        style={{
          width: 'min(390px, calc(100% - 32px))',
          padding: 0,
          border: 0,
          borderRadius: 20,
          boxShadow: 'var(--shadow)',
        }}
      >
        <form className="card stack" onSubmit={saveNextDate}>
          <div className="list-row" style={{ paddingTop: 0 }}>
            <h2 id="schedule-title" className="section-title" style={{ margin: 0 }}>
              다음 시술 일정
            </h2>
            <button
              className="icon-button"
              type="button"
              aria-label="닫기"
              onClick={() => dialogRef.current?.close()}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="field">
            <label htmlFor="next-procedure">예정 날짜</label>
            <input
              id="next-procedure"
              type="date"
              value={nextDate}
              onChange={(event) => setNextDate(event.target.value)}
            />
          </div>
          <button className="button full" type="submit">
            저장
          </button>
        </form>
      </dialog>
    </AppShell>
  );
}

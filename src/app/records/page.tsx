'use client';

import { AppShell } from '@/components/app-shell/app-shell';
import { LoadingScreen } from '@/components/common/loading-screen';
import { useRecoveryStore } from '@/store/recovery-store';
import { CalendarPlus, ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

const SHOW_NEXT_PROCEDURE = true;

function RecordsPageContent() {
  const searchParams = useSearchParams();
  const hydrated = useRecoveryStore((state) => state.hydrated);
  const session = useRecoveryStore((state) => state.session);
  const saveProfile = useRecoveryStore((state) => state.saveProfile);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const scheduleDetailDialogRef = useRef<HTMLDialogElement>(null);
  const procedureTypeLabel = session?.procedure?.procedureType === 'picotoning' ? '피코토닝' : '-';
  const [nextDate, setNextDate] = useState(session?.profile.nextProcedureAt ?? '');
  useEffect(() => {
    if (!hydrated) return;
    if (searchParams.get('addSchedule') === '1') {
      dialogRef.current?.showModal();
    }
  }, [hydrated, searchParams]);
  if (!hydrated) return <LoadingScreen />;
  const now = new Date();
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const todayDay = isCurrentMonth ? now.getDate() : null;
  const dayCount = new Date(year, month + 1, 0).getDate();
  const firstDayOffset = new Date(year, month, 1).getDay();
  const calendarCellCount = 42;
  const trailingBlankCount = calendarCellCount - firstDayOffset - dayCount;

  const checkedDays = new Set(
    (session?.checkIns ?? [])
      .filter((item) => {
        const date = new Date(item.checkedAt);
        return date.getFullYear() === year && date.getMonth() === month;
      })
      .map((item) => new Date(item.checkedAt).getDate()),
  );
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const procedureDay =
    session?.procedure?.performedAt.slice(0, 7) === monthKey
      ? Number(session.procedure.performedAt.slice(8, 10))
      : null;
  const nextProcedureDay =
    session?.profile.nextProcedureAt?.slice(0, 7) === monthKey
      ? Number(session.profile.nextProcedureAt.slice(8, 10))
      : null;

  async function deleteNextProcedure() {
    if (!session?.profile.nextProcedureAt) return;

    await saveProfile({
      ...session.profile,
      nextProcedureAt: undefined,
    });

    setNextDate('');
    scheduleDetailDialogRef.current?.close();
  }

  async function saveNextDate(event: React.FormEvent) {
    event.preventDefault();
    await saveProfile({
      ...(session?.profile ?? { sensitivity: 'normal' }),
      nextProcedureAt: nextDate || undefined,
    });
    dialogRef.current?.close();
  }

  function goToPreviousMonth() {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
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
          <strong>달력</strong>
          <button
            className="button secondary"
            type="button"
            onClick={() => dialogRef.current?.showModal()}
          >
            <CalendarPlus size={17} aria-hidden="true" /> 일정 추가
          </button>
        </div>

        <div className="calendar-month-nav">
          <button
            className="icon-button"
            type="button"
            aria-label="이전 달"
            onClick={goToPreviousMonth}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>

          <strong aria-live="polite">
            {year}년 {month + 1}월
          </strong>

          <button
            className="icon-button"
            type="button"
            aria-label="다음 달"
            onClick={goToNextMonth}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="calendar" aria-label={`${year}년 ${month + 1}월 달력`}>
          {'일월화수목금토'.split('').map((day) => (
            <span key={day} style={{ color: 'var(--ink-soft)', fontWeight: 700 }}>
              {day}
            </span>
          ))}
          {Array.from({ length: firstDayOffset }, (_, index) => (
            <span key={`blank-start-${index}`} />
          ))}
          {Array.from({ length: dayCount }, (_, index) => index + 1).map((day) => {
            const isProcedureDay = day === procedureDay;
            const isCheckedDay = checkedDays.has(day);
            const isNextProcedureDay = SHOW_NEXT_PROCEDURE && day === nextProcedureDay;
            const isToday = day === todayDay;

            const descriptions: string[] = [];

            if (isToday) descriptions.push('오늘');
            if (isProcedureDay) descriptions.push('시술일');
            if (isCheckedDay) descriptions.push('피부 체크한 날');
            if (isNextProcedureDay) descriptions.push('다음 시술 예정');

            return (
              <span
                key={day}
                className={
                  [isToday ? 'today' : '', isNextProcedureDay ? 'next-procedure' : '']
                    .filter(Boolean)
                    .join(' ') || undefined
                }

                onClick={
                  isNextProcedureDay
                    ? () => scheduleDetailDialogRef.current?.showModal()
                    : undefined
                }
                onKeyDown={
                  isNextProcedureDay
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          scheduleDetailDialogRef.current?.showModal();
                        }
                      }
                    : undefined
                }
                role={isNextProcedureDay ? 'button' : undefined}
                tabIndex={isNextProcedureDay ? 0 : undefined}

                aria-label={`${month + 1}월 ${day}일${
                  descriptions.length ? `, ${descriptions.join(', ')}` : ''
                }`}
              >
                <span className="calendar-day-number">{day}</span>

                <span className="calendar-dots" aria-hidden="true">
                  {isProcedureDay ? <i className="calendar-dot procedure-dot" /> : null}

                  {isCheckedDay ? <i className="calendar-dot check-dot" /> : null}
                </span>
              </span>
            );
          })}
          {Array.from({ length: trailingBlankCount }, (_, index) => (
            <span key={`blank-end-${index}`} />
          ))}
        </div>
        <div className="calendar-legend" aria-label="달력 표시 안내">
          <span>
            <i className="calendar-dot procedure-dot" aria-hidden="true" />
            시술일
          </span>
          <span>
            <i className="calendar-dot check-dot" aria-hidden="true" />
            피부 체크한 날
          </span>
          <span>
            <i className="calendar-today-marker" aria-hidden="true" />
            오늘
          </span>
          {SHOW_NEXT_PROCEDURE ? (
            <span>
              <i className="next-procedure-marker" aria-hidden="true" />
              다음 시술 예정
            </span>
          ) : null}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">체크 기록</h2>
        {session?.checkIns.length ? (
          <div className="card">
            {[...session.checkIns].reverse().map((checkIn) => (
              <Link
                className="list-row"
                href={`/check-in/result?id=${checkIn.id}`}
                key={checkIn.id}
              >
                <span className="list-row-main">
                  <strong>
                    {new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(
                      new Date(checkIn.checkedAt),
                    )}
                  </strong>
                  <span>선택 항목 {checkIn.answers.filter((answer) => answer.present).length}개</span>
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
      <dialog
        ref={scheduleDetailDialogRef}
        aria-labelledby="schedule-detail-title"
        style={{
          width: 'min(390px, calc(100% - 32px))',
          padding: 0,
          border: 0,
          borderRadius: 20,
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="card stack">
          <div className="list-row" style={{ paddingTop: 0 }}>
            <h2 id="schedule-detail-title" className="section-title" style={{ margin: 0 }}>
              다음 시술 일정
            </h2>

            <button
              className="icon-button"
              type="button"
              aria-label="닫기"
              onClick={() => scheduleDetailDialogRef.current?.close()}
            >
              <X aria-hidden="true" />
            </button>
          </div>

          <div className="stack" style={{ gap: 6 }}>
            <span style={{ color: 'var(--ink-soft)', fontSize: 13 }}>시술 종류</span>
            <strong>{procedureTypeLabel}</strong>
          </div>

          <div className="stack" style={{ gap: 6 }}>
            <span style={{ color: 'var(--ink-soft)', fontSize: 13 }}>예정 날짜</span>
            <strong>{session?.profile.nextProcedureAt}</strong>
          </div>

          <button
            className="button danger full"
            type="button"
            onClick={() => void deleteNextProcedure()}
          >
            <Trash2 size={18} aria-hidden="true" />
            삭제하기
          </button>
        </div>
      </dialog>
    </AppShell>
  );
}

export default function RecordsPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RecordsPageContent />
    </Suspense>
  );
}

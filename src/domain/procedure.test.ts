import { describe, expect, it } from 'vitest';
import { getProcedureDay, getRecoveryMilestone, toLocalDateInputValue } from './procedure';

describe('getProcedureDay', () => {
  it('returns D+0 on the procedure date', () => {
    expect(getProcedureDay('2026-07-29', new Date(2026, 6, 29, 23, 59))).toBe(0);
  });

  it('calculates calendar-day difference instead of elapsed hours', () => {
    expect(getProcedureDay('2026-07-26', new Date(2026, 6, 29, 0, 1))).toBe(3);
  });

  it('returns a negative number for a future procedure so the form can block it', () => {
    expect(getProcedureDay('2026-07-30', new Date(2026, 6, 29))).toBe(-1);
  });

  it('formats the local calendar date for date inputs', () => {
    expect(toLocalDateInputValue(new Date(2026, 6, 29, 23, 30))).toBe('2026-07-29');
  });
});

describe('getRecoveryMilestone', () => {
  it('shows milestones on D+7 and from D+14', () => {
    expect(getRecoveryMilestone(6)).toBeNull();
    expect(getRecoveryMilestone(7)).toBe('first-week');
    expect(getRecoveryMilestone(8)).toBeNull();
    expect(getRecoveryMilestone(13)).toBeNull();
    expect(getRecoveryMilestone(14)).toBe('recovery-complete');
    expect(getRecoveryMilestone(20)).toBe('recovery-complete');
  });
});

export type Sensitivity = 'low' | 'normal' | 'high';

export type ProcedureRecord = {
  id: string;
  procedureType: 'picotoning';
  performedAt: string;
  createdAt: string;
};

export type UserProfile = {
  sensitivity: Sensitivity;
  cleansingFeel?: 'comfortable' | 'tight' | 'unknown';
  nextProcedureAt?: string;
};

export type RecoveryMilestone = 'first-week' | 'recovery-complete';

export function getRecoveryMilestone(procedureDay: number): RecoveryMilestone | null {
  if (procedureDay >= 14) return 'recovery-complete';
  if (procedureDay === 7) return 'first-week';
  return null;
}

export function getProcedureDay(performedAt: string, now: Date): number {
  const performed = new Date(`${performedAt.slice(0, 10)}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((today.getTime() - performed.getTime()) / 86_400_000);
}

export function toLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

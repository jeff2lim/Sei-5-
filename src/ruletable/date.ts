export function getNextProcedureDay(
  performedAt: string | undefined,
  nextProcedureAt: string | undefined,
): number | null {
  if (!performedAt || !nextProcedureAt) return null;
  const performed = new Date(`${performedAt.slice(0, 10)}T00:00:00`);
  const next = new Date(`${nextProcedureAt.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(performed.getTime()) || Number.isNaN(next.getTime())) return null;
  return Math.round((next.getTime() - performed.getTime()) / 86_400_000);
}

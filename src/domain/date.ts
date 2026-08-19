/**
 * 프로젝트 내부 날짜 값은 모두 사용자 브라우저의 로컬 시간대를 기준으로 다룹니다.
 * toISOString()은 UTC 기준이라 자정 근처(예: 한국 시간 자정~오전 9시)에
 * 실제 날짜와 다른 값을 반환할 수 있으므로 날짜 비교·표시에는 이 유틸리티를 사용합니다.
 */
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isSameLocalDate(isoTimestamp: string, reference: Date): boolean {
  return toLocalDateKey(new Date(isoTimestamp)) === toLocalDateKey(reference);
}

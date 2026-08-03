import type { VerdictLevel } from '@/domain/product';
import { AlertTriangle, CircleCheck, CircleHelp, OctagonX } from 'lucide-react';

const labels: Record<VerdictLevel, string> = {
  go: '가능',
  care: '주의',
  stop: '중단',
  unknown: '판정 정보 없음',
};

export function verdictLabel(level: VerdictLevel) {
  return labels[level];
}

export function VerdictBadge({ level }: { level: VerdictLevel }) {
  const Icon =
    level === 'go'
      ? CircleCheck
      : level === 'care'
        ? AlertTriangle
        : level === 'stop'
          ? OctagonX
          : CircleHelp;
  return (
    <span className={`badge ${level}`}>
      <Icon size={14} aria-hidden="true" />
      {labels[level]}
    </span>
  );
}

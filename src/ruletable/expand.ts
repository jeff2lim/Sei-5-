import {
  behaviorWarnings,
  prepBehaviorWarnings,
  prepTimelines,
  sensitivityPolicies,
  timelines,
} from './data';
import type {
  ExpandedPrepTimeline,
  ExpandedTimeline,
  GeneratedRuleTable,
  PrepRuleCell,
  PrepTimeline,
  PrepTimelinePhase,
  RuleCell,
  RuleStatus,
  Sensitivity,
  Timeline,
  TimelinePhase,
} from './types';

const sensitivities: Sensitivity[] = ['low', 'normal', 'high'];

function phaseAt(timeline: Timeline, day: number) {
  const phase = timeline.phases.find(
    (candidate) => day >= candidate.from_d && day <= candidate.to_d,
  );
  if (!phase) throw new Error(`${timeline.timeline_id}: D+${day} 구간이 없습니다.`);
  return phase;
}

function compressPhases(days: TimelinePhase[]): TimelinePhase[] {
  return days.reduce<TimelinePhase[]>((result, day) => {
    const previous = result.at(-1);
    if (
      previous &&
      previous.verdict === day.verdict &&
      previous.condition_text === day.condition_text &&
      previous.to_d + 1 === day.from_d
    ) {
      previous.to_d = day.to_d;
      return result;
    }
    result.push({ ...day });
    return result;
  }, []);
}

function prepPhaseAt(timeline: PrepTimeline, daysToNext: number) {
  const phase = timeline.phases.find(
    (candidate) => daysToNext <= candidate.from_dtn && daysToNext >= candidate.to_dtn,
  );
  if (!phase) {
    throw new Error(`${timeline.prep_timeline_id}: dtn ${daysToNext} 구간이 없습니다.`);
  }
  return phase;
}

function compressPrepPhases(days: PrepTimelinePhase[]): PrepTimelinePhase[] {
  return days.reduce<PrepTimelinePhase[]>((result, day) => {
    const previous = result.at(-1);
    if (
      previous &&
      previous.verdict === day.verdict &&
      previous.condition_text === day.condition_text &&
      previous.to_dtn - 1 === day.from_dtn
    ) {
      previous.to_dtn = day.to_dtn;
      return result;
    }
    result.push({ ...day });
    return result;
  }, []);
}

function cellStatus(timeline: Timeline, day: number): RuleStatus {
  if (
    timeline.status === 'needs_review' ||
    timeline.status === 'confirmed' ||
    timeline.status === 'pending_removal'
  )
    return timeline.status;
  return day <= 7 ? 'team_provisional' : 'extrapolated';
}

export function expandTimeline(timeline: Timeline, sensitivity: Sensitivity): ExpandedTimeline {
  const shift = timeline.sensitivity_policy
    ? sensitivityPolicies[timeline.sensitivity_policy][sensitivity]
    : 0;
  const baseCareDay = timeline.phases.find((phase) => phase.verdict === 'care')?.from_d ?? null;
  const baseReopenDay = timeline.phases.find((phase) => phase.verdict === 'go')?.from_d ?? null;
  const trueReopenDay = baseReopenDay === null ? null : baseReopenDay + shift;
  const deferred = trueReopenDay !== null && trueReopenDay > 14;

  const days = Array.from({ length: 15 }, (_, day): TimelinePhase => {
    const sourceDay = Math.max(0, Math.min(14, day - shift));
    const source = phaseAt(timeline, sourceDay);
    return {
      from_d: day,
      to_d: day,
      verdict: source.verdict,
      condition_text:
        deferred && day === 14 && source.verdict === 'care'
          ? '아주 소량부터 · 이후 병원 상담 권장'
          : source.condition_text,
    };
  });

  return {
    ...timeline,
    timeline_id: timeline.timeline_id.replace(/\.normal$/, `.${sensitivity}`),
    sensitivity,
    phases: compressPhases(days),
    care_start_d: baseCareDay === null ? null : Math.max(0, Math.min(14, baseCareDay + shift)),
    reopen_d_day: deferred || trueReopenDay === null ? null : Math.max(0, trueReopenDay),
    true_reopen_d: deferred ? trueReopenDay : null,
    deferred,
  };
}

export function expandPrepTimeline(
  timeline: PrepTimeline,
  sensitivity: Sensitivity,
): ExpandedPrepTimeline {
  const shift = timeline.sensitivity_policy
    ? sensitivityPolicies[timeline.sensitivity_policy][sensitivity]
    : 0;
  const days = Array.from({ length: 7 }, (_, index): PrepTimelinePhase => {
    const daysToNext = 7 - index;
    const sourceDaysToNext = Math.max(1, Math.min(7, daysToNext + shift));
    const source = prepPhaseAt(timeline, sourceDaysToNext);
    return {
      from_dtn: daysToNext,
      to_dtn: daysToNext,
      verdict: source.verdict,
      condition_text: source.condition_text,
    };
  });
  const stopStart = days.find((day) => day.verdict === 'stop')?.from_dtn ?? null;
  return {
    ...timeline,
    prep_timeline_id: timeline.prep_timeline_id.replace(/\.normal$/, `.${sensitivity}`),
    sensitivity,
    phases: compressPrepPhases(days),
    stop_start_dtn: stopStart,
  };
}

export function expandRuleTable(): GeneratedRuleTable {
  const expandedTimelines = timelines.flatMap((timeline) =>
    sensitivities.map((sensitivity) => expandTimeline(timeline, sensitivity)),
  );
  const expandedPrepTimelines = prepTimelines.flatMap((timeline) =>
    sensitivities.map((sensitivity) => expandPrepTimeline(timeline, sensitivity)),
  );
  const baseByTarget = new Map(timelines.map((timeline) => [timeline.target_id, timeline]));
  const cells: RuleCell[] = expandedTimelines.flatMap((timeline) => {
    const base = baseByTarget.get(timeline.target_id);
    if (!base) throw new Error(`${timeline.target_id}: 원본 타임라인이 없습니다.`);
    return Array.from({ length: 15 }, (_, day) => {
      const phase = timeline.phases.find(
        (candidate) => day >= candidate.from_d && day <= candidate.to_d,
      );
      if (!phase) throw new Error(`${timeline.timeline_id}: D+${day} 전개 셀이 없습니다.`);
      return {
        timeline_id: timeline.timeline_id,
        target_type: timeline.target_type,
        target_id: timeline.target_id,
        sensitivity: timeline.sensitivity,
        sensitivity_policy: timeline.sensitivity_policy,
        d_day: day,
        phase_name: day <= 7 ? 'recovery' : 'ramp_up',
        verdict: phase.verdict,
        condition_text: phase.condition_text,
        status: cellStatus(base, day),
        flags: timeline.flags,
        deferred: timeline.deferred,
        true_reopen_d: timeline.true_reopen_d,
      };
    });
  });
  const prepCells: PrepRuleCell[] = expandedPrepTimelines.flatMap((timeline) =>
    Array.from({ length: 7 }, (_, index) => {
      const daysToNext = 7 - index;
      const phase = timeline.phases.find(
        (candidate) => daysToNext <= candidate.from_dtn && daysToNext >= candidate.to_dtn,
      );
      if (!phase) {
        throw new Error(`${timeline.prep_timeline_id}: dtn ${daysToNext} 전개 셀이 없습니다.`);
      }
      return {
        prep_timeline_id: timeline.prep_timeline_id,
        target_type: timeline.target_type,
        target_id: timeline.target_id,
        sensitivity: timeline.sensitivity,
        sensitivity_policy: timeline.sensitivity_policy,
        days_to_next: daysToNext,
        phase_name: 'prep',
        verdict: phase.verdict,
        condition_text: phase.condition_text,
        status: timeline.status,
      };
    }),
  );

  return {
    version: '6.0.0',
    generated_at: 'deterministic-from-data-v6',
    range: [-7, 14],
    timelines: expandedTimelines,
    cells,
    prep_timelines: expandedPrepTimelines,
    prep_cells: prepCells,
    warnings: behaviorWarnings,
    prep_warnings: prepBehaviorWarnings,
  };
}

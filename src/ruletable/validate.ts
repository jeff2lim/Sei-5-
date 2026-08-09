import { ingredientGroups, ingredientSynonyms, timelines } from './data';
import { expandRuleTable } from './expand';
import type { Timeline, ValidationReport, Verdict } from './types';

const severity: Partial<Record<Verdict, number>> = { go: 0, care: 1, stop: 2 };

function validateTimeline(timeline: Timeline, report: ValidationReport) {
  const prefix = timeline.timeline_id;
  const phases = [...timeline.phases].sort((a, b) => a.from_d - b.from_d);
  if (phases[0]?.from_d !== 0 || phases.at(-1)?.to_d !== 14) {
    report.errors.push(`${prefix}: phases가 D+0~14 전체를 덮지 않습니다.`);
  }
  phases.forEach((phase, index) => {
    if (phase.to_d < phase.from_d) report.errors.push(`${prefix}: 역전된 구간이 있습니다.`);
    const previous = phases[index - 1];
    if (previous && phase.from_d !== previous.to_d + 1) {
      report.errors.push(
        `${prefix}: D+${previous.to_d}와 D+${phase.from_d} 사이가 겹치거나 비었습니다.`,
      );
    }
    if (phase.verdict === 'care' && !phase.condition_text) {
      report.warnings.push(`${prefix}: care 구간에 condition_text가 없습니다.`);
    }
    if (previous) {
      const before = severity[previous.verdict];
      const after = severity[phase.verdict];
      if (before !== undefined && after !== undefined && after > before) {
        report.errors.push(`${prefix}: 시간 경과에 따라 판정이 더 엄격해집니다.`);
      }
      if (previous.verdict === 'stop' && phase.verdict === 'go') {
        report.warnings.push(`${prefix}: stop → go 직접 전이입니다.`);
      }
    }
  });
  if (timeline.status === 'confirmed' && timeline.evidence.citations.length === 0) {
    report.errors.push(`${prefix}: confirmed 룰에 인용이 없습니다.`);
  }
}

export function validateRuleTable(): ValidationReport {
  const report: ValidationReport = {
    errors: [],
    warnings: [],
    statusCounts: {},
    co2FractionalEvidence: [],
    deferred: [],
    needsReview: [],
  };
  const ids = new Set<string>();
  const targetKeys = new Set<string>();
  for (const timeline of timelines) {
    if (ids.has(timeline.timeline_id))
      report.errors.push(`중복 timeline_id: ${timeline.timeline_id}`);
    ids.add(timeline.timeline_id);
    const targetKey = `${timeline.target_type}:${timeline.target_id}`;
    if (targetKeys.has(targetKey)) report.errors.push(`중복 target: ${targetKey}`);
    targetKeys.add(targetKey);
    validateTimeline(timeline, report);
    report.statusCounts[timeline.status] = (report.statusCounts[timeline.status] ?? 0) + 1;
    if (timeline.status === 'needs_review') report.needsReview.push(timeline.timeline_id);
    if (timeline.evidence.source_procedure === 'co2_fractional') {
      report.co2FractionalEvidence.push(timeline.timeline_id);
    }
  }

  const clinic = ingredientGroups.find((group) => group.id === 'clinic_provided');
  const clinicTimeline = timelines.find((timeline) => timeline.target_id === 'clinic_provided');
  if (
    clinic?.judgment_mode !== 'consult_only' ||
    clinicTimeline?.phases.some((phase) => phase.verdict !== 'consult')
  ) {
    report.errors.push('consult_only 항목이 consult 외 판정을 산출합니다.');
  }
  const advisoryIds = ingredientGroups
    .filter((group) => group.judgment_mode === 'advisory')
    .map((group) => group.id);
  if (timelines.some((timeline) => advisoryIds.includes(timeline.target_id))) {
    report.errors.push('advisory 항목이 판정 타임라인에 참여합니다.');
  }

  const zinc = ingredientSynonyms.zinc;
  const zincAll = new Set(zinc.all.map((value) => value.toLocaleLowerCase()));
  for (const excluded of zinc.excluded ?? []) {
    if (zincAll.has(excluded.toLocaleLowerCase())) {
      report.errors.push(`zinc.excluded 항목이 all에도 포함됨: ${excluded}`);
    }
  }

  const generated = expandRuleTable();
  report.deferred = generated.timelines
    .filter((timeline) => timeline.deferred)
    .map((timeline) => timeline.timeline_id);
  for (const timeline of generated.timelines) {
    if (timeline.deferred && timeline.reopen_d_day !== null) {
      report.errors.push(`${timeline.timeline_id}: deferred인데 reopen_d_day가 존재합니다.`);
    }
    if (timeline.deferred && (timeline.true_reopen_d ?? 0) <= 14) {
      report.errors.push(`${timeline.timeline_id}: true_reopen_d 클램프가 잘못되었습니다.`);
    }
  }

  for (const timeline of timelines.filter((item) => item.sensitivity_policy === 'restorative')) {
    const variants = generated.timelines.filter((item) => item.target_id === timeline.target_id);
    if (new Set(variants.map((item) => JSON.stringify(item.phases))).size !== 1) {
      report.errors.push(`${timeline.timeline_id}: restorative가 민감도에 따라 이동했습니다.`);
    }
  }
  for (const timeline of timelines.filter((item) => item.sensitivity_policy === 'pigment_rail')) {
    const low = generated.timelines.find(
      (item) => item.target_id === timeline.target_id && item.sensitivity === 'low',
    );
    const normal = generated.timelines.find(
      (item) => item.target_id === timeline.target_id && item.sensitivity === 'normal',
    );
    if (JSON.stringify(low?.phases) !== JSON.stringify(normal?.phases)) {
      report.errors.push(`${timeline.timeline_id}: pigment_rail low가 normal보다 당겨졌습니다.`);
    }
  }

  return report;
}

export function assertValidRuleTable() {
  const report = validateRuleTable();
  if (report.errors.length) throw new Error(report.errors.join('\n'));
  return report;
}

import enumsJson from '../../data/enums.json';
import {
  cleansingMethods,
  combinationPairs,
  ingredientGroups,
  ingredientSynonyms,
  prepTimelines,
  sensitivityPolicies,
  timelines,
} from './data';
import { buildCombinations } from './combine';
import { expandRuleTable } from './expand';
import { adjustVerdictBySymptoms, resolveProduct, resolveTarget } from './resolve';
import type { CombinationTarget, PrepTimeline, Timeline, ValidationReport, Verdict } from './types';

const severity: Partial<Record<Verdict, number>> = { go: 0, care: 1, stop: 2 };
const implementationDriftIds = [
  'ing.vitamin_c.normal',
  'ing.exfoliating_acid.normal',
  'ingredient.fragrance.advisory',
];

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

function validatePrepTimeline(timeline: PrepTimeline, report: ValidationReport) {
  const prefix = timeline.prep_timeline_id;
  const phases = [...timeline.phases].sort((a, b) => b.from_dtn - a.from_dtn);
  if (phases[0]?.from_dtn !== 7 || phases.at(-1)?.to_dtn !== 1) {
    report.errors.push(`${prefix}: phases가 dtn 7~1 전체를 덮지 않습니다.`);
  }
  phases.forEach((phase, index) => {
    if (phase.from_dtn < phase.to_dtn) {
      report.errors.push(`${prefix}: from_dtn이 to_dtn보다 작습니다.`);
    }
    const previous = phases[index - 1];
    if (previous && phase.from_dtn !== previous.to_dtn - 1) {
      report.errors.push(
        `${prefix}: dtn ${previous.to_dtn}와 ${phase.from_dtn} 사이가 겹치거나 비었습니다.`,
      );
    }
    if (phase.verdict === 'care' && !phase.condition_text) {
      report.warnings.push(`${prefix}: care 구간에 condition_text가 없습니다.`);
    }
    if (previous) {
      const before = severity[previous.verdict];
      const after = severity[phase.verdict];
      if (before !== undefined && after !== undefined && after < before) {
        report.errors.push(`${prefix}: dtn이 줄어드는데 판정이 덜 엄격해집니다.`);
      }
    }
  });
  if (
    timeline.sensitivity_policy === 'restorative' &&
    phases.some((phase) => phase.verdict === 'stop')
  ) {
    report.errors.push(`${prefix}: restorative가 준비기에서 stop입니다.`);
  }
  if (
    timeline.target_type === 'sunscreen_type' &&
    phases.some((phase) => phase.verdict === 'stop')
  ) {
    report.errors.push(`${prefix}: 자외선 차단이 준비기에서 stop입니다.`);
  }
}

function targetExists(target: CombinationTarget) {
  return target.type === 'ingredient_group'
    ? ingredientGroups.some((item) => item.id === target.id)
    : cleansingMethods.some((item) => item.id === target.id);
}

function validateCombinations(report: ValidationReport) {
  const ids = new Set<string>();
  const unordered = new Set<string>();
  for (const pair of combinationPairs) {
    if (ids.has(pair.pair_id)) report.errors.push(`중복 pair_id: ${pair.pair_id}`);
    ids.add(pair.pair_id);
    if (pair.verdict_effect !== 'none') {
      report.errors.push(`${pair.pair_id}: 병용 규칙이 판정을 변경합니다.`);
    }
    if (pair.active_from_d !== null) {
      report.errors.push(`${pair.pair_id}: active_from_d가 수동 저작됐습니다.`);
    }
    if (!targetExists(pair.a) || !targetExists(pair.b)) {
      report.errors.push(`${pair.pair_id}: 존재하지 않는 target 참조입니다.`);
    }
    if (pair.relation === 'separate_time' && (!pair.slot_a || !pair.slot_b)) {
      report.errors.push(`${pair.pair_id}: 시간대 분리 슬롯이 없습니다.`);
    }
    const restrictive = pair.relation === 'separate_days' || pair.relation === 'separate_time';
    if (restrictive) {
      for (const target of [pair.a, pair.b]) {
        const group =
          target.type === 'ingredient_group'
            ? ingredientGroups.find((candidate) => candidate.id === target.id)
            : null;
        if (group?.sensitivity_policy === 'restorative') {
          report.errors.push(`${pair.pair_id}: restorative 성분군에 분리 제한이 있습니다.`);
        }
      }
    }
    const key = [`${pair.a.type}:${pair.a.id}`, `${pair.b.type}:${pair.b.id}`].sort().join('|');
    if (unordered.has(key)) report.errors.push(`${pair.pair_id}: 양방향 중복 쌍입니다.`);
    unordered.add(key);
  }
  const generated = buildCombinations('normal');
  const restrictiveStarts = generated
    .filter((pair) => pair.relation !== 'no_restriction')
    .map((pair) => pair.active_from_d);
  const earliestRestriction = Math.min(...restrictiveStarts);
  generated
    .filter(
      (pair) => pair.relation === 'no_restriction' && pair.active_from_d > earliestRestriction,
    )
    .forEach((pair) =>
      report.warnings.push(`${pair.pair_id}: 제한 없음 안내가 주의 쌍보다 늦게 열립니다.`),
    );
}

function validateOverlapGate(report: ValidationReport) {
  const generated = expandRuleTable();
  for (const cycle of [7, 14, 21, 28]) {
    for (let day = 0; day <= 14; day += 1) {
      const daysToNext = cycle - day;
      if (daysToNext < 1 || daysToNext > 7) continue;
      for (const prep of prepTimelines) {
        const mainCell = generated.cells.find(
          (cell) =>
            cell.target_type === prep.target_type &&
            cell.target_id === prep.target_id &&
            cell.sensitivity === 'normal' &&
            cell.d_day === day,
        );
        const prepCell = generated.prep_cells.find(
          (cell) =>
            cell.target_type === prep.target_type &&
            cell.target_id === prep.target_id &&
            cell.sensitivity === 'normal' &&
            cell.days_to_next === daysToNext,
        );
        if (!mainCell || !prepCell) continue;
        const resolved = resolveTarget(prep.target_type, prep.target_id, day, 'normal', cycle);
        const mainRank = severity[mainCell.verdict];
        const prepRank = severity[prepCell.verdict];
        if (
          mainRank !== undefined &&
          prepRank !== undefined &&
          prepRank > mainRank &&
          !resolved.prepGated
        ) {
          report.errors.push(
            `${prep.prep_timeline_id}: ${cycle}일 주기 D+${day} 준비기 우선 표시 누락`,
          );
        }
      }
    }
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
    pendingRemoval: [],
    implementationDrift: [...implementationDriftIds],
    excludedIngredients: [],
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
    if (timeline.status === 'pending_removal') report.pendingRemoval.push(timeline.timeline_id);
    if (timeline.evidence.source_procedure === 'co2_fractional') {
      report.co2FractionalEvidence.push(timeline.timeline_id);
    }
  }
  for (const timeline of prepTimelines) {
    if (ids.has(timeline.prep_timeline_id)) {
      report.errors.push(`중복 prep_timeline_id: ${timeline.prep_timeline_id}`);
    }
    ids.add(timeline.prep_timeline_id);
    validatePrepTimeline(timeline, report);
    report.statusCounts[timeline.status] = (report.statusCounts[timeline.status] ?? 0) + 1;
    if (timeline.status === 'needs_review') report.needsReview.push(timeline.prep_timeline_id);
    if (timeline.status === 'pending_removal')
      report.pendingRemoval.push(timeline.prep_timeline_id);
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

  for (const [groupId, dictionary] of Object.entries(ingredientSynonyms)) {
    const all = new Set(dictionary.all.map((value) => value.toLocaleLowerCase()));
    for (const excluded of dictionary.excluded ?? []) {
      report.excludedIngredients.push(`${groupId}:${excluded}`);
      if (all.has(excluded.toLocaleLowerCase())) {
        report.errors.push(`${groupId}.excluded 항목이 all에도 포함됨: ${excluded}`);
      }
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
  const prepGate = enumsJson.sensitivity_policy.includes('prep_gate')
    ? sensitivityPolicies.prep_gate
    : null;
  if (!prepGate || prepGate.low > 0) report.errors.push('prep_gate.low가 0보다 큽니다.');

  if ('unknown' in enumsJson.severity_order) {
    report.errors.push('unknown이 severity_order에 포함됐습니다.');
  }
  const unknownAdjusted = adjustVerdictBySymptoms(
    'unknown',
    { type: 'ingredient_group', id: 'missing', policy: null },
    5,
    [{ id: 'redness', present: true, severity: 3 }],
  );
  if (unknownAdjusted.verdict !== 'unknown') report.errors.push('unknown이 증상 하향됐습니다.');
  const unknownProduct = resolveProduct(
    {
      productId: 'validation-unknown',
      productName: '판정 미연결',
      ingredientGroupIds: [],
      cleansingMethodIds: [],
      baseMakeupIds: [],
    },
    3,
    'normal',
  );
  if (unknownProduct.verdict !== 'unknown' || unknownProduct.primaryText.includes('문제 없음')) {
    report.errors.push('unknown 출력 계약이 잘못됐습니다.');
  }

  validateCombinations(report);
  validateOverlapGate(report);

  for (const expected of [
    'ing.brightening_functional.normal',
    'ing.vitamin_c.normal',
    'ing.exfoliating_acid.normal',
    'prep.scrub_deep.normal',
  ]) {
    if (!report.needsReview.includes(expected)) {
      report.errors.push(`${expected}: needs_review 목록에서 누락됐습니다.`);
    }
  }
  if (
    !ingredientGroups.some(
      (group) => group.id === 'acne_active' && group.status === 'pending_removal',
    )
  ) {
    report.errors.push('acne_active pending_removal 상태가 누락됐습니다.');
  }

  return report;
}

export function assertValidRuleTable() {
  const report = validateRuleTable();
  if (report.errors.length) throw new Error(report.errors.join('\n'));
  return report;
}

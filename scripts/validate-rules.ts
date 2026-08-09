import { validateRuleTable } from '../src/ruletable/validate';

async function main() {
  try {
    const report = validateRuleTable();
    if (report.errors.length) throw new Error(report.errors.join('\n'));
    console.log('Recovery Note rule table v5 validation passed');
    console.log(`status: ${JSON.stringify(report.statusCounts)}`);
    console.log(`warnings: ${report.warnings.length}`);
    report.warnings.forEach((warning) => console.log(`  - ${warning}`));
    console.log(`deferred: ${report.deferred.join(', ') || 'none'}`);
    console.log(`needs_review: ${report.needsReview.join(', ') || 'none'}`);
    console.log(`co2_fractional evidence: ${report.co2FractionalEvidence.join(', ') || 'none'}`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

void main();

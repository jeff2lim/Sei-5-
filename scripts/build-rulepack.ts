import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildCombinations } from '../src/ruletable/combine';
import { expandRuleTable } from '../src/ruletable/expand';
import { assertValidRuleTable } from '../src/ruletable/validate';

async function main() {
  assertValidRuleTable();
  const rulePack = expandRuleTable();
  const outputDirectory = path.join(process.cwd(), 'build');
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    path.join(outputDirectory, 'rules.generated.json'),
    `${JSON.stringify(rulePack, null, 2)}\n`,
  );
  const combinations = (['low', 'normal', 'high'] as const).flatMap((sensitivity) =>
    buildCombinations(sensitivity),
  );
  await writeFile(
    path.join(outputDirectory, 'combinations.generated.json'),
    `${JSON.stringify({ version: rulePack.version, combinations }, null, 2)}\n`,
  );
  console.log(
    `Built v${rulePack.version}: ${rulePack.timelines.length} recovery timelines, ${rulePack.prep_timelines.length} prep timelines, ${combinations.length} combinations`,
  );
}

void main();

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
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
  console.log(
    `Built v${rulePack.version}: ${rulePack.timelines.length} timelines, ${rulePack.cells.length} cells → build/rules.generated.json`,
  );
}

void main();

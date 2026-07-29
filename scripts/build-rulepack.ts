import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { validateRuleFiles } from '../src/rules/schema';
import { readRuleFiles } from './rule-files';

async function main() {
  const rulePack = validateRuleFiles(await readRuleFiles());
  const outputDirectory = path.join(process.cwd(), 'src', 'rules', 'generated');
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, 'rulepack.json'), JSON.stringify(rulePack, null, 2));
  console.log(`Built ${rulePack.meta.version} → src/rules/generated/rulepack.json`);
}

void main();

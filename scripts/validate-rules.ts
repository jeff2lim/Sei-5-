import { validateRuleFiles } from '../src/rules/schema';
import { readRuleFiles } from './rule-files';

async function main() {
  try {
    const rulePack = validateRuleFiles(await readRuleFiles());
    console.log(
      `Rule pack ${rulePack.meta.version}: ${rulePack.attributes.length} attributes, ${rulePack.verdictRules.length} verdict rules`,
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

void main();

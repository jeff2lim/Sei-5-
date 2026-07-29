import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function readRuleFiles() {
  const root = process.cwd();
  const readJson = async (name: string) =>
    JSON.parse(await readFile(path.join(root, 'rules', name), 'utf8')) as unknown;
  return {
    meta: await readJson('meta.json'),
    attributes: await readJson('attributes.json'),
    verdictRules: await readJson('verdict-rules.json'),
    contactRules: await readJson('contact-rules.json'),
  };
}

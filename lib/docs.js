import { existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from './runner.js';

const DOCS_TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'docs');

export function generateDocs(outputDir = 'docs', { dryRun = false } = {}) {
  if (!existsSync(outputDir)) {
    if (!dryRun) mkdirSync(outputDir, { recursive: true });
    log.info(`Created directory: ${outputDir}`);
  }

  const files = readdirSync(DOCS_TEMPLATES).filter((f) => f.endsWith('.md'));
  for (const file of files) {
    const src = join(DOCS_TEMPLATES, file);
    const dest = join(outputDir, file);
    if (!dryRun) copyFileSync(src, dest);
    log.ok(`Generated: ${dest}`);
  }

  return files.length;
}

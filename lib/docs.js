import { existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from './runner.js';

const DOCS_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'docs');

// Doc sets live side by side:
//   'default'  → templates/docs/*.md          (corporate: proxy, VPN, macbook…)
//   'bootcamp' → templates/docs/bootcamp/*.md (first-time setup, git, troubleshooting)
// The default set reads only the top-level *.md files, so adding subfolders
// never changes what `--docs` has always produced.
const DOC_SETS = {
  default: DOCS_ROOT,
  bootcamp: join(DOCS_ROOT, 'bootcamp'),
};

export function generateDocs(outputDir = 'docs', { dryRun = false, set = 'default' } = {}) {
  const sourceDir = DOC_SETS[set] ?? DOC_SETS.default;

  if (!existsSync(sourceDir)) {
    log.warn(`No documentation templates found for set "${set}"`);
    return 0;
  }

  if (!existsSync(outputDir)) {
    if (!dryRun) mkdirSync(outputDir, { recursive: true });
    log.info(`Created directory: ${outputDir}`);
  }

  const files = readdirSync(sourceDir).filter((f) => f.endsWith('.md'));
  for (const file of files) {
    const src = join(sourceDir, file);
    const dest = join(outputDir, file);
    if (!dryRun) copyFileSync(src, dest);
    log.ok(`Generated: ${dest}`);
  }

  return files.length;
}

export function listDocs(set = 'default') {
  const sourceDir = DOC_SETS[set] ?? DOC_SETS.default;
  if (!existsSync(sourceDir)) return [];
  return readdirSync(sourceDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}

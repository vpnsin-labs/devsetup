import { execSync, spawnSync } from 'node:child_process';

export const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

export const log = {
  ok: (m) => console.log(`  ${c.green('✔')} ${m}`),
  skip: (m) => console.log(`  ${c.dim('•')} ${c.dim(m)}`),
  info: (m) => console.log(`  ${c.cyan('→')} ${m}`),
  warn: (m) => console.log(`  ${c.yellow('!')} ${m}`),
  error: (m) => console.log(`  ${c.red('✘')} ${m}`),
  section: (m) => console.log(`\n${c.bold(m)}`),
};

export function hasCommand(cmd) {
  const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], {
    stdio: 'pipe',
  });
  return result.status === 0;
}

export function run(cmd, { dryRun = false } = {}) {
  console.log(`  ${c.dim('$')} ${c.cyan(cmd)}`);
  if (!dryRun) {
    execSync(cmd, { stdio: 'inherit' });
  }
}

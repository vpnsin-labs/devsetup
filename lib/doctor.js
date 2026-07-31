import { hasCommand, capture, log, c } from './runner.js';

// ── Version helpers ──────────────────────────────────────────────────────────

// Pull the first x.y.z (or x.y) out of a version banner. Tools are wildly
// inconsistent here ("git version 2.43.0", "v22.11.0", "10.9.0"), so we scan
// rather than parse per-tool.
function parseVersion(text) {
  if (!text) return null;
  const match = text.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) return null;
  return {
    raw: match[0],
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3] ?? 0),
  };
}

function versionOf(cmd, args = ['--version']) {
  if (!hasCommand(cmd)) return null;
  return parseVersion(capture(cmd, args));
}

// ── Check definitions ────────────────────────────────────────────────────────
//
// Each check returns one of:
//   { status: 'pass', detail }         — all good
//   { status: 'fail', detail, fix }    — actionable, with a copy-pasteable fix
//   { status: 'warn', detail, fix }    — optional/nice-to-have, not a blocker
//
// `required` marks a check as gating: any failed required check sets a
// non-zero exit code so this is usable in CI and in a workshop pre-flight.

const CHECK_LIBRARY = {
  git: {
    label: 'Git',
    required: true,
    run: () => {
      const v = versionOf('git');
      if (!v) return { status: 'fail', detail: 'not found', fix: 'devsetup --bootcamp' };
      return { status: 'pass', detail: v.raw };
    },
  },

  node: {
    label: 'Node.js',
    required: true,
    run: () => {
      const v = versionOf('node');
      if (!v) return { status: 'fail', detail: 'not found', fix: 'devsetup --bootcamp' };
      if (v.major < 18) {
        return {
          status: 'fail',
          detail: `v${v.raw} — too old, needs v18+`,
          fix: 'fnm install lts-latest && fnm default lts-latest',
        };
      }
      return { status: 'pass', detail: `v${v.raw}` };
    },
  },

  npm: {
    label: 'npm',
    required: true,
    run: () => {
      const v = versionOf('npm');
      if (!v)
        return {
          status: 'fail',
          detail: 'not found',
          fix: 'reinstall Node.js — npm ships with it',
        };
      return { status: 'pass', detail: v.raw };
    },
  },

  'git-identity': {
    label: 'Git identity',
    required: true,
    run: () => {
      if (!hasCommand('git'))
        return { status: 'fail', detail: 'git not installed', fix: 'devsetup --bootcamp' };
      const name = capture('git', ['config', '--global', 'user.name']);
      const email = capture('git', ['config', '--global', 'user.email']);
      if (!name && !email) {
        return {
          status: 'fail',
          detail: 'user.name and user.email not set',
          fix: 'devsetup --identity',
        };
      }
      if (!name) return { status: 'fail', detail: 'user.name not set', fix: 'devsetup --identity' };
      if (!email)
        return { status: 'fail', detail: 'user.email not set', fix: 'devsetup --identity' };
      return { status: 'pass', detail: `${name} <${email}>` };
    },
  },

  vscode: {
    label: 'VS Code',
    required: true,
    run: () => {
      for (const cli of ['code', 'code-insiders']) {
        if (hasCommand(cli)) {
          const v = parseVersion(capture(cli, ['--version']));
          return { status: 'pass', detail: v ? v.raw : 'installed' };
        }
      }
      return {
        status: 'fail',
        detail: '`code` not on PATH',
        fix: 'install VS Code, then run "Shell Command: Install \'code\' command in PATH"',
      };
    },
  },

  'vscode-extensions': {
    label: 'VS Code extensions',
    required: false,
    run: ({ extensions = [] } = {}) => {
      const cli = ['code', 'code-insiders'].find((x) => hasCommand(x));
      if (!cli) return { status: 'warn', detail: 'skipped — `code` not on PATH' };
      if (extensions.length === 0) return { status: 'pass', detail: 'none required' };

      const installed = (capture(cli, ['--list-extensions']) ?? '').toLowerCase().split('\n');
      const missing = extensions.filter((id) => !installed.includes(id.toLowerCase()));
      if (missing.length === 0) {
        return { status: 'pass', detail: `${extensions.length}/${extensions.length} installed` };
      }
      return {
        status: 'fail',
        detail: `missing ${missing.length}: ${missing.join(', ')}`,
        fix: 'devsetup --vscode --minimal',
      };
    },
  },

  github: {
    label: 'GitHub reachable',
    required: false,
    run: () => {
      if (!hasCommand('git')) return { status: 'warn', detail: 'skipped — git not installed' };
      // Bounded: on a slow or captive network this would otherwise hang the
      // whole doctor run, which is the exact situation we're diagnosing.
      const out = capture('git', ['ls-remote', 'https://github.com/git/git.git', 'HEAD'], {
        timeout: 10_000,
      });
      if (!out) {
        return {
          status: 'warn',
          detail: 'could not reach github.com in 10s',
          fix: 'check your wifi, or set a proxy: devsetup --dotfiles',
        };
      }
      return { status: 'pass', detail: 'ok' };
    },
  },

  docker: {
    label: 'Docker',
    required: false,
    run: () => {
      if (!hasCommand('docker'))
        return { status: 'warn', detail: 'not found (optional)', fix: 'devsetup --web' };
      const info = capture('docker', ['info', '--format', '{{.ServerVersion}}']);
      if (!info) {
        return {
          status: 'warn',
          detail: 'installed but daemon not running',
          fix: 'start Docker Desktop',
        };
      }
      return { status: 'pass', detail: info };
    },
  },
};

// ── Checklists per audience ──────────────────────────────────────────────────
//
// Keys map to a profile flag where one exists, so `--doctor --bootcamp` and
// `--doctor --web` read naturally. `default` runs when no profile is given.

export const CHECKLISTS = {
  default: ['git', 'node', 'npm', 'git-identity', 'vscode'],
  bootcamp: ['git', 'node', 'npm', 'git-identity', 'vscode', 'vscode-extensions', 'github'],
  js: ['git', 'node', 'npm', 'git-identity', 'vscode'],
  web: ['git', 'node', 'npm', 'git-identity', 'vscode', 'docker'],
  backend: ['git', 'node', 'npm', 'git-identity', 'vscode', 'docker'],
  devops: ['git', 'git-identity', 'docker'],
};

const STATUS_ICON = {
  pass: c.green('✔'),
  fail: c.red('✘'),
  warn: c.yellow('!'),
};

// ── Runner ───────────────────────────────────────────────────────────────────

export function runDoctor({ checklist = 'default', extensions = [] } = {}) {
  const ids = CHECKLISTS[checklist] ?? CHECKLISTS.default;

  log.section(`Doctor — ${checklist} checklist`);
  console.log(`  ${c.dim('Checking your machine. Nothing is installed or changed.')}\n`);

  const results = [];
  for (const id of ids) {
    const check = CHECK_LIBRARY[id];
    if (!check) continue;

    let outcome;
    try {
      outcome = check.run({ extensions });
    } catch (err) {
      outcome = { status: 'warn', detail: `check errored: ${err.message}` };
    }

    const required = Boolean(check.required);
    results.push({ id, label: check.label, required, ...outcome });

    const icon = STATUS_ICON[outcome.status] ?? '?';
    const label = check.label.padEnd(20);
    const detail = outcome.status === 'pass' ? c.dim(outcome.detail) : outcome.detail;
    console.log(`  ${icon} ${label} ${detail}`);
    if (outcome.fix && outcome.status !== 'pass') {
      console.log(`    ${c.dim('→')} ${c.cyan(outcome.fix)}`);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.status === 'pass').length;
  const blockers = results.filter((r) => r.status === 'fail' && r.required);
  const softFails = results.filter((r) => r.status === 'fail' && !r.required);
  const warns = results.filter((r) => r.status === 'warn');

  console.log(`\n${c.bold('─'.repeat(52))}`);
  console.log(`  ${passed} of ${results.length} checks passed.`);

  if (blockers.length) {
    log.error(
      `${blockers.length} blocking issue${blockers.length > 1 ? 's' : ''}: ${blockers.map((b) => b.label).join(', ')}`
    );
    console.log(
      `\n  ${c.dim('Fix the lines marked')} ${c.red('✘')} ${c.dim('above, then run')} ${c.cyan('devsetup --doctor')} ${c.dim('again.')}\n`
    );
  } else if (softFails.length || warns.length) {
    log.ok('No blocking issues — you can start building.');
    console.log(
      `  ${c.dim('The')} ${c.yellow('!')} ${c.dim('lines are optional extras you can set up later.')}\n`
    );
  } else {
    log.ok("Everything checks out. You're ready to go.");
    console.log('');
  }

  return { results, blockers: blockers.length };
}

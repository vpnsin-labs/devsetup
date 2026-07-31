import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeSpec,
  buildInstallCmd,
  managerKeyOf,
  isRunnable,
  chooseCandidates,
  refreshWindowsPath,
} from '../lib/platform.js';
import { TOOLS } from '../lib/tools.js';

// ── normalizeSpec ─────────────────────────────────────────────────────────────
test('normalizeSpec returns [] for empty values', () => {
  assert.deepEqual(normalizeSpec(null), []);
  assert.deepEqual(normalizeSpec(undefined), []);
});

test('normalizeSpec wraps a legacy single-key object as one candidate', () => {
  assert.deepEqual(normalizeSpec({ brew: 'git' }), [{ brew: 'git' }]);
});

test('normalizeSpec flattens an array of candidates in order', () => {
  assert.deepEqual(normalizeSpec([{ apt: 'redis-tools' }, { dnf: 'redis' }]), [
    { apt: 'redis-tools' },
    { dnf: 'redis' },
  ]);
});

test('normalizeSpec expands a multi-key object in manager-priority order', () => {
  // Keys intentionally out of priority order in the source object.
  assert.deepEqual(normalizeSpec({ choco: 'jq', winget: 'jqlang.jq', scoop: 'jq' }), [
    { winget: 'jqlang.jq' },
    { scoop: 'jq' },
    { choco: 'jq' },
  ]);
});

// ── buildInstallCmd: backward compatibility (byte-identical legacy commands) ───
test('buildInstallCmd produces the original commands for legacy keys', () => {
  assert.equal(buildInstallCmd({ brew: 'git' }), 'brew install git');
  assert.equal(buildInstallCmd({ cask: 'docker' }), 'brew install --cask docker');
  assert.equal(buildInstallCmd({ apt: 'jq' }), 'sudo apt-get install -y jq');
  assert.equal(buildInstallCmd({ snap: 'code --classic' }), 'sudo snap install code --classic');
  assert.equal(
    buildInstallCmd({ winget: 'Git.Git' }),
    'winget install --silent --accept-source-agreements --accept-package-agreements --id Git.Git'
  );
  assert.equal(buildInstallCmd({ npm: 'pnpm' }), 'npm install -g pnpm');
  assert.equal(buildInstallCmd({ script: 'curl x | sh' }), 'curl x | sh');
  assert.equal(buildInstallCmd(null), null);
});

test('buildInstallCmd supports the new manager keys', () => {
  assert.equal(buildInstallCmd({ dnf: 'redis' }), 'sudo dnf install -y redis');
  assert.equal(buildInstallCmd({ yum: 'redis' }), 'sudo yum install -y redis');
  assert.equal(buildInstallCmd({ pacman: 'redis' }), 'sudo pacman -S --noconfirm redis');
  assert.equal(buildInstallCmd({ zypper: 'redis' }), 'sudo zypper install -y redis');
  assert.equal(buildInstallCmd({ scoop: 'jq' }), 'scoop install jq');
  assert.equal(buildInstallCmd({ choco: 'jq' }), 'choco install -y jq');
  assert.match(
    buildInstallCmd({ flatpak: 'com.visualstudio.code' }),
    /flatpak install --user -y flathub com\.visualstudio\.code$/
  );
});

test('buildInstallCmd preserves legacy priority for a multi-key object', () => {
  // brew wins over script, matching the pre-change behaviour.
  assert.equal(buildInstallCmd({ script: 'x', brew: 'git' }), 'brew install git');
});

test('winget installs auto-accept source and package agreements', () => {
  // Without these flags winget blocks on a first-run agreement prompt that an
  // unattended install can't answer (stdin is owned by our readline).
  const cmd = buildInstallCmd({ winget: 'Schniz.fnm' });
  assert.match(cmd, /--accept-source-agreements/);
  assert.match(cmd, /--accept-package-agreements/);
});

// ── refreshWindowsPath ────────────────────────────────────────────────────────
test('refreshWindowsPath never throws and only ever adds PATH entries', () => {
  const before = process.env.PATH;
  assert.doesNotThrow(() => refreshWindowsPath());
  assert.equal(typeof process.env.PATH, 'string', 'PATH must remain a string');
  // Off Windows it is a pure no-op; on Windows it is additive but normalizes
  // (trims, drops empty segments, dedupes case-insensitively). Compare on the
  // same normalized footing: every real entry present before must still be
  // present afterwards. (A raw compare would false-fail on a Windows PATH with
  // a trailing ';' — a common, correctly-dropped empty segment.)
  const norm = (p) =>
    new Set(
      (p ?? '')
        .split(';')
        .map((seg) => seg.trim().toLowerCase())
        .filter(Boolean)
    );
  const after = norm(process.env.PATH);
  for (const dir of norm(before)) {
    assert.ok(after.has(dir), `refreshWindowsPath dropped an existing PATH entry: ${dir}`);
  }
  if (process.platform !== 'win32') assert.equal(process.env.PATH, before);
});

// ── managerKeyOf ──────────────────────────────────────────────────────────────
test('managerKeyOf returns the single manager key', () => {
  assert.equal(managerKeyOf({ brew: 'git' }), 'brew');
  assert.equal(managerKeyOf({}), null);
  assert.equal(managerKeyOf(null), null);
});

// ── isRunnable / chooseCandidates ─────────────────────────────────────────────
test('isRunnable treats script as universally available', () => {
  assert.equal(isRunnable({ script: 'curl x | sh' }, new Set()), true);
});

test('isRunnable checks the detected manager set', () => {
  const managers = new Set(['dnf']);
  assert.equal(isRunnable({ apt: 'jq' }, managers), false);
  assert.equal(isRunnable({ dnf: 'jq' }, managers), true);
});

test('chooseCandidates keeps only runnable methods, preserving order', () => {
  const managers = new Set(['dnf']); // Fedora: no apt/pacman/zypper, no snap
  const spec = [{ apt: 'redis-tools' }, { dnf: 'redis' }, { pacman: 'redis' }];
  assert.deepEqual(chooseCandidates(spec, managers), [{ dnf: 'redis' }]);
});

test('chooseCandidates always retains a script fallback', () => {
  const managers = new Set(); // nothing detected
  const spec = [{ npm: 'pnpm' }, { script: 'curl x | sh' }];
  assert.deepEqual(chooseCandidates(spec, managers), [{ script: 'curl x | sh' }]);
});

// ── Catalogue invariant ───────────────────────────────────────────────────────
// npm needs Node, which fnm installs only AFTER the tool loop, and the detected
// manager set is frozen for the run. So any npm-based spec must have a non-npm
// fallback or it would be silently skipped on a fresh machine.
test('every npm-based install spec has a non-npm fallback', () => {
  for (const tool of TOOLS) {
    for (const platform of ['macos', 'linux', 'windows']) {
      const keys = normalizeSpec(tool.install?.[platform]).map(managerKeyOf);
      if (keys.includes('npm')) {
        assert.ok(
          keys.some((key) => key !== 'npm'),
          `${tool.id} (${platform}) relies on npm with no non-npm fallback`
        );
      }
    }
  }
});

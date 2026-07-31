import { spawnSync } from 'node:child_process';
import { hasCommand, run, log } from './runner.js';

export function detectPlatform() {
  switch (process.platform) {
    case 'darwin':
      return 'macos';
    case 'linux':
      return 'linux';
    case 'win32':
      return 'windows';
    default:
      return 'linux';
  }
}

// Priority order used both to expand a multi-key install spec into ordered
// candidates and to pick a command inside buildInstallCmd. Native system
// package managers come first, then app stores / add-on managers, then the
// universal `script`/`npm` escape hatches last.
const MANAGER_ORDER = [
  'brew',
  'cask',
  'apt',
  'dnf',
  'yum',
  'pacman',
  'zypper',
  'snap',
  'flatpak',
  'winget',
  'scoop',
  'choco',
  'npm',
  'script',
];

// Managers assumed present for the rest of a --dry-run after a printed-only
// bootstrap, so the plan reflects the post-bootstrap state. Keyed by platform so
// a macOS assumption never leaks into Windows/Linux detection. In a REAL run we
// instead extend process.env.PATH (see prependToPath) so the bootstrapped
// manager is genuinely invocable, rather than merely assumed.
const assumedManagers = new Map();
let managerCache = new Map();

export function resetManagerCache() {
  managerCache = new Map();
}

function assumeManager(platform, key) {
  if (!assumedManagers.has(platform)) assumedManagers.set(platform, new Set());
  assumedManagers.get(platform).add(key);
  resetManagerCache();
}

// Prepend directories to this process's PATH so a just-bootstrapped manager
// (whose installer only edits shell profiles / the registry for future shells)
// becomes usable by subsequent execSync/hasCommand calls in this same run.
function prependToPath(...dirs) {
  const sep = process.platform === 'win32' ? ';' : ':';
  const existing = process.env.PATH ?? '';
  const entries = new Set(existing.split(sep));
  const additions = dirs.filter((dir) => dir && !entries.has(dir));
  if (additions.length) process.env.PATH = [...additions, existing].join(sep);
  resetManagerCache();
}

// Read a REG_SZ / REG_EXPAND_SZ `Path` value out of a registry key and return it
// as an ordered list of directories, expanding %VAR% references from the current
// environment. Returns [] if reg.exe is unavailable or the value is absent.
function regPathEntries(hive) {
  // reg.exe is a real PE binary, so spawnSync can launch it directly (no shell);
  // passing the space-containing hive as one argv element keeps it intact.
  const res = spawnSync('reg', ['query', hive, '/v', 'Path'], { encoding: 'utf8' });
  if (res.status !== 0 || res.error || !res.stdout) return [];
  const m = res.stdout.match(/\bPath\b\s+REG(?:_EXPAND)?_SZ\s+([^\r\n]*)/i);
  if (!m) return [];
  const expanded = m[1].replace(/%([^%]+)%/g, (whole, name) => process.env[name] ?? whole);
  return expanded
    .split(';')
    .map((dir) => dir.trim())
    .filter(Boolean);
}

// Windows only. A tool just installed by winget/choco/scoop (or the Node MSI)
// writes its bin directory into the machine/user PATH in the registry, but THIS
// process inherited the launching shell's PATH from before that write — so a
// freshly-installed `git` reads as "not found" until the user opens a new
// terminal. Re-read PATH from the registry and merge it into process.env.PATH so
// same-run checks (doctor) and installs see the new entries immediately. Purely
// additive and best-effort: current entries keep priority, and any failure leaves
// PATH untouched.
export function refreshWindowsPath() {
  if (process.platform !== 'win32') return;
  const machine = regPathEntries(
    'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment'
  );
  const user = regPathEntries('HKCU\\Environment');
  if (machine.length === 0 && user.length === 0) return; // reg unreadable — leave PATH as-is

  const seen = new Set();
  const merged = [];
  for (const dir of [...(process.env.PATH ?? '').split(';'), ...machine, ...user]) {
    const trimmed = dir.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(trimmed);
  }
  process.env.PATH = merged.join(';');
  resetManagerCache();
}

// ── Install-spec normalisation ────────────────────────────────────────────────
// A platform install value is EITHER a single spec object (legacy shape,
// e.g. { brew: 'git' }) OR an ordered array of spec objects expressing
// fallbacks (e.g. [{ apt: 'redis-tools' }, { dnf: 'redis' }]). A single object
// may also carry several manager keys. normalizeSpec flattens any of these into
// an ordered list of single-manager candidate objects.

function expandSpec(obj) {
  if (!obj || typeof obj !== 'object') return [];
  // Truthy check (not `!= null`) so an empty/typo'd value never becomes a
  // candidate that buildInstallCmd can't turn into a command.
  return MANAGER_ORDER.filter((key) => obj[key]).map((key) => ({ [key]: obj[key] }));
}

export function normalizeSpec(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(expandSpec);
  return expandSpec(value);
}

export function managerKeyOf(candidate) {
  if (!candidate || typeof candidate !== 'object') return null;
  const keys = Object.keys(candidate);
  return keys.length ? keys[0] : null;
}

// ── Package-manager detection ─────────────────────────────────────────────────
// Returns the set of manager keys actually usable on this machine. Probed once
// per platform via hasCommand and memoised; call resetManagerCache() after a
// successful bootstrap to force a re-probe. `script` is universally runnable and
// is never probed (handled directly in isRunnable).

export function detectManagers(platform, { force = false } = {}) {
  if (!force && managerCache.has(platform)) return managerCache.get(platform);

  const present = new Set();
  const probe = (key, binary = key) => {
    if (hasCommand(binary)) present.add(key);
  };

  if (platform === 'macos') {
    if (hasCommand('brew')) {
      present.add('brew');
      present.add('cask'); // cask is `brew install --cask` on the same binary
    }
    probe('npm');
  } else if (platform === 'linux') {
    probe('apt', 'apt-get');
    probe('dnf');
    probe('yum');
    probe('pacman');
    probe('zypper');
    probe('snap');
    probe('flatpak');
    probe('npm');
  } else if (platform === 'windows') {
    probe('winget');
    probe('scoop');
    probe('choco');
    probe('npm');
  }

  const assumed = assumedManagers.get(platform);
  if (assumed) for (const manager of assumed) present.add(manager);

  managerCache.set(platform, present);
  return present;
}

export function isRunnable(candidate, managers) {
  const key = managerKeyOf(candidate);
  if (!key) return false;
  if (key === 'script') return true; // self-bootstrapping curl/raw command
  return managers.has(key);
}

export function chooseCandidates(spec, managers) {
  return normalizeSpec(spec).filter((candidate) => isRunnable(candidate, managers));
}

// ── Package-manager bootstrap ─────────────────────────────────────────────────
// Best-effort, conservative. Installs Homebrew on macOS and (when no manager is
// present) offers Scoop on Windows. Never auto-installs a system package
// manager on Linux — apt/dnf/pacman ARE the OS.

export async function ensurePackageManager(platform, options = {}) {
  if (platform === 'macos') return bootstrapHomebrew(options);
  if (platform === 'windows') return bootstrapWindows(options);
  if (platform === 'linux') return warnIfNoLinuxManager();
}

function bootstrapHomebrew({ dryRun = false } = {}) {
  if (hasCommand('brew')) return;
  log.info('Installing Homebrew (this may take a few minutes)...');
  run(
    '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
    { dryRun }
  );
  if (dryRun) {
    // Nothing was actually installed — assume it so the plan shows brew/cask.
    assumeManager('macos', 'brew');
    assumeManager('macos', 'cask');
    return;
  }
  // The Homebrew installer only edits shell profiles; make brew usable now.
  prependToPath('/opt/homebrew/bin', '/usr/local/bin');
}

async function bootstrapWindows({ dryRun = false, autoYes = false, confirm } = {}) {
  if (hasCommand('winget') || hasCommand('scoop') || hasCommand('choco')) return;

  const ask = typeof confirm === 'function' ? confirm : async () => true;
  log.warn('No package manager found (winget / scoop / choco).');
  const yes = autoYes || (await ask('Install Scoop (no admin needed) to enable installs?', true));
  if (!yes) {
    log.warn('Skipping bootstrap — tools without an available installer will be skipped.');
    return;
  }

  log.info('Installing Scoop...');
  run(
    'powershell -NoProfile -Command "Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force; irm get.scoop.sh | iex"',
    { dryRun }
  );
  if (dryRun) {
    assumeManager('windows', 'scoop');
    return;
  }
  // Scoop adds its shims dir to the user PATH (registry) — invisible to this
  // running process — so add it now to make `scoop` usable for the install loop.
  prependToPath(String.raw`${process.env.USERPROFILE ?? ''}\scoop\shims`);
  if (!hasCommand('scoop')) {
    log.warn('Scoop did not finish installing — some tools may be skipped. See https://scoop.sh');
  }
}

function warnIfNoLinuxManager() {
  const hasNative = ['apt-get', 'dnf', 'yum', 'pacman', 'zypper'].some((manager) =>
    hasCommand(manager)
  );
  if (!hasNative) {
    log.warn(
      'No system package manager detected (apt/dnf/yum/pacman/zypper). Tools will use script installers where available.'
    );
  }
}

// Build the shell command for a single install spec. Accepts a single- or
// multi-key object; for multi-key it returns the highest-priority manager's
// command (MANAGER_ORDER), so legacy specs produce byte-identical commands.
export function buildInstallCmd(spec) {
  if (!spec) return null;
  if (spec.brew) return `brew install ${spec.brew}`;
  if (spec.cask) return `brew install --cask ${spec.cask}`;
  if (spec.apt) return `sudo apt-get install -y ${spec.apt}`;
  if (spec.dnf) return `sudo dnf install -y ${spec.dnf}`;
  if (spec.yum) return `sudo yum install -y ${spec.yum}`;
  if (spec.pacman) return `sudo pacman -S --noconfirm ${spec.pacman}`;
  if (spec.zypper) return `sudo zypper install -y ${spec.zypper}`;
  if (spec.snap) return `sudo snap install ${spec.snap}`;
  if (spec.flatpak)
    return `flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo && flatpak install --user -y flathub ${spec.flatpak}`;
  // --accept-source-agreements/--accept-package-agreements stop winget blocking on
  // the first-run "Do you agree to the source agreements?" prompt, which hangs an
  // unattended install (stdin is owned by our readline) with no way to answer.
  if (spec.winget)
    return `winget install --silent --accept-source-agreements --accept-package-agreements --id ${spec.winget}`;
  if (spec.scoop) return `scoop install ${spec.scoop}`;
  if (spec.choco) return `choco install -y ${spec.choco}`;
  if (spec.npm) return `npm install -g ${spec.npm}`;
  if (spec.script) return spec.script;
  return null;
}

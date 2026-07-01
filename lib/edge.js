import { homedir, tmpdir } from 'node:os';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { run, log, c } from './runner.js';
import { detectManagers, chooseCandidates, buildInstallCmd, managerKeyOf } from './platform.js';

const TEMPLATES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'edge');

// Edge install spec — reuses the ordered-fallback installer machinery.
const EDGE_INSTALL = {
  macos: { cask: 'microsoft-edge' },
  linux: {
    script:
      'curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | sudo gpg --dearmor -o /usr/share/keyrings/microsoft-edge.gpg && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft-edge.gpg] https://packages.microsoft.com/repos/edge stable main" | sudo tee /etc/apt/sources.list.d/microsoft-edge.list > /dev/null && sudo apt-get update && sudo apt-get install -y microsoft-edge-stable',
  },
  windows: [{ winget: 'Microsoft.Edge' }, { choco: 'microsoft-edge' }],
};

// ── Paths ─────────────────────────────────────────────────────────────────────
function edgeUserDataDir(platform) {
  const HOME = homedir();
  if (platform === 'windows') {
    return join(
      process.env.LOCALAPPDATA ?? join(HOME, 'AppData', 'Local'),
      'Microsoft',
      'Edge',
      'User Data'
    );
  }
  if (platform === 'macos') return join(HOME, 'Library', 'Application Support', 'Microsoft Edge');
  return join(HOME, '.config', 'microsoft-edge');
}

function loadTemplate(name) {
  const path = join(TEMPLATES_DIR, name);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    log.warn(`Could not parse templates/edge/${name}: ${err.message}`);
    return null;
  }
}

// Merge curated settings + recommended extensions into one Edge policy object.
function buildPolicies() {
  const settings = loadTemplate('settings.json')?.policies ?? {};
  const ext = loadTemplate('extensions.json');
  const policies = { ...settings };
  if (ext?.recommended?.length) {
    const extensionSettings = {};
    for (const e of ext.recommended) {
      extensionSettings[e.id] = {
        installation_mode: 'normal_installed', // auto-installed, user-removable
        update_url: ext.update_url,
      };
    }
    policies.ExtensionSettings = extensionSettings;
  }
  return policies;
}

// ── Install ───────────────────────────────────────────────────────────────────
function installEdge(platform, { dryRun }) {
  // Edge ships with Windows; on macOS/Linux install via the fallback chain.
  const managers = detectManagers(platform);
  const candidates = chooseCandidates(EDGE_INSTALL[platform], managers);
  if (candidates.length === 0) {
    log.warn('Microsoft Edge — no available installer; assuming it is already installed.');
    return;
  }
  log.info('Ensuring Microsoft Edge is installed...');
  for (const cand of candidates) {
    const cmd = buildInstallCmd(cand);
    try {
      run(cmd, { dryRun });
      log.ok('Microsoft Edge present');
      return;
    } catch {
      log.warn(`Edge install via ${managerKeyOf(cand)} failed — trying next...`);
    }
  }
  log.warn('Could not install Edge automatically — continuing (it may already be installed).');
}

// ── Policy application (per OS) ───────────────────────────────────────────────
function regEscape(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function policiesToReg(policies) {
  const lines = [
    'Windows Registry Editor Version 5.00',
    '',
    '[HKEY_CURRENT_USER\\Software\\Policies\\Microsoft\\Edge]',
  ];
  for (const [key, val] of Object.entries(policies)) {
    if (typeof val === 'boolean') lines.push(`"${key}"=dword:${val ? '00000001' : '00000000'}`);
    else if (typeof val === 'number')
      lines.push(`"${key}"=dword:${(val >>> 0).toString(16).padStart(8, '0')}`);
    else if (typeof val === 'string') lines.push(`"${key}"="${regEscape(val)}"`);
    else lines.push(`"${key}"="${regEscape(JSON.stringify(val))}"`); // dict → JSON string
  }
  return lines.join('\r\n') + '\r\n';
}

function applyPoliciesWindows(policies, { dryRun }) {
  const regPath = join(tmpdir(), 'devsetup-edge-policies.reg');
  const content = policiesToReg(policies);
  log.info(
    `Writing Edge policies to ${c.bold('HKCU\\Software\\Policies\\Microsoft\\Edge')} (no admin needed)`
  );
  if (dryRun) {
    console.log(content.replace(/^/gm, '    '));
    return;
  }
  writeFileSync(regPath, content, 'utf8');
  run(`reg import "${regPath}"`, { dryRun });
}

function applyPoliciesMac(policies, { dryRun }) {
  log.info('Applying Edge policies via `defaults` (com.microsoft.Edge)');
  for (const [key, val] of Object.entries(policies)) {
    let cmd;
    if (typeof val === 'boolean') cmd = `defaults write com.microsoft.Edge ${key} -bool ${val}`;
    else if (typeof val === 'number') cmd = `defaults write com.microsoft.Edge ${key} -int ${val}`;
    else if (typeof val === 'string')
      cmd = `defaults write com.microsoft.Edge ${key} -string '${val}'`;
    else cmd = `defaults write com.microsoft.Edge ${key} -string '${JSON.stringify(val)}'`;
    run(cmd, { dryRun });
  }
}

function applyPoliciesLinux(policies, { dryRun }) {
  const dir = '/etc/opt/edge/policies/managed';
  const file = `${dir}/devsetup-edge.json`;
  log.info(`Writing Edge managed policy to ${c.bold(file)} (requires sudo)`);
  const json = JSON.stringify(policies, null, 2).replace(/'/g, `'\\''`);
  if (dryRun) {
    console.log(JSON.stringify(policies, null, 2).replace(/^/gm, '    '));
    return;
  }
  run(`sudo mkdir -p ${dir} && printf '%s' '${json}' | sudo tee ${file} > /dev/null`, { dryRun });
}

function applyPolicies(platform, policies, opts) {
  if (Object.keys(policies).length === 0) return;
  if (platform === 'windows') return applyPoliciesWindows(policies, opts);
  if (platform === 'macos') return applyPoliciesMac(policies, opts);
  return applyPoliciesLinux(policies, opts);
}

// ── Bookmarks ─────────────────────────────────────────────────────────────────
// Materialise the simplified template into a valid Edge Bookmarks file.
function materializeBookmarks(template) {
  // Windows FILETIME epoch (µs since 1601-01-01) — accepted by Edge.
  const now = ((Date.now() + 11644473600000) * 1000).toString();
  let id = 0;
  const build = (node) => {
    const base = { date_added: now, guid: randomUUID(), id: String(++id), name: node.name ?? '' };
    if (node.type === 'url') return { ...base, type: 'url', url: node.url };
    return {
      ...base,
      type: 'folder',
      date_modified: now,
      children: (node.children ?? []).map(build),
    };
  };
  const roots = {};
  for (const key of ['bookmark_bar', 'other', 'synced']) {
    if (template[key]) roots[key] = build(template[key]);
  }
  return { roots, version: 1 };
}

function applyBookmarks(platform, { dryRun }) {
  const template = loadTemplate('bookmarks.json');
  if (!template) return;
  const dest = join(edgeUserDataDir(platform), 'Default', 'Bookmarks');
  log.info(`Installing curated bookmarks → ${c.bold(dest)}`);
  log.warn('Close Microsoft Edge first, or it will overwrite the imported bookmarks on exit.');
  if (dryRun) {
    log.skip('(dry-run) would back up any existing Bookmarks and write the curated set');
    return;
  }
  const destDir = dirname(dest);
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  if (existsSync(dest)) {
    renameSync(dest, `${dest}.bak`);
    log.info(`Backed up existing Bookmarks → ${dest}.bak`);
  }
  writeFileSync(dest, JSON.stringify(materializeBookmarks(template), null, 2), 'utf8');
  log.ok('Bookmarks installed');
}

// ── Orchestration ─────────────────────────────────────────────────────────────
export async function setupEdge(platform, { dryRun = false, autoYes = false, confirm } = {}) {
  const ask = typeof confirm === 'function' ? confirm : async () => true;
  const ext = loadTemplate('extensions.json');
  const bookmarks = loadTemplate('bookmarks.json');
  const extCount = ext?.recommended?.length ?? 0;
  const settingCount = Object.keys(loadTemplate('settings.json')?.policies ?? {}).length;
  let bmCount = 0;
  const count = (n) => {
    if (n.type === 'url') bmCount++;
    (n.children ?? []).forEach(count);
  };
  if (bookmarks) Object.values(bookmarks).forEach(count);

  log.section('Microsoft Edge baseline');
  console.log(
    `  ${c.dim(`${extCount} extensions · ${settingCount} settings · ${bmCount} bookmarks`)}`
  );
  console.log(
    `  ${c.dim('Extensions install as removable; settings apply as managed policies.')}\n`
  );

  const yes = autoYes || dryRun || (await ask('Set up Edge with the curated baseline?', true));
  if (!yes) {
    log.skip('Skipped Edge setup.');
    return;
  }

  installEdge(platform, { dryRun });
  applyPolicies(platform, buildPolicies(), { dryRun });
  applyBookmarks(platform, { dryRun });

  console.log(`\n${c.bold('Next steps:')}`);
  console.log('  1. Fully quit and reopen Microsoft Edge for policies/extensions to load');
  console.log('  2. Review extensions at edge://extensions and settings at edge://settings\n');
}

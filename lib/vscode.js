import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasCommand, run, log, c } from './runner.js';
import { getDotfileTargets, buildVars, installDotfile } from './dotfiles.js';

const VSCODE_TEMPLATES = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'templates',
  'dotfiles',
  'vscode'
);

// Prefer stable `code`, fall back to Insiders.
function detectCodeCli() {
  for (const cli of ['code', 'code-insiders']) {
    if (hasCommand(cli)) return cli;
  }
  return null;
}

// `set` is 'full' (the professional baseline) or 'minimal' (a beginner's four).
// Unknown sets fall back to the full list, so existing callers are unaffected.
export function loadRecommendations(set = 'full') {
  const file = set === 'minimal' ? 'extensions.minimal.json' : 'extensions.json';
  const path = join(VSCODE_TEMPLATES, file);
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, 'utf8')).recommendations ?? [];
  } catch (err) {
    log.warn(`Could not parse vscode/${file}: ${err.message}`);
    return [];
  }
}

function installExtensions(cli, recommendations, { dryRun }) {
  let ok = 0;
  let failed = 0;
  for (const id of recommendations) {
    try {
      run(`${cli} --install-extension ${id} --force`, { dryRun });
      ok++;
    } catch {
      log.warn(`Failed to install ${id} — continuing`);
      failed++;
    }
  }
  return { ok, failed };
}

// Apply the VS Code settings.json + keybindings.json shipped as dotfiles,
// backing up any existing files (reuses the dotfiles machinery).
async function applySettings(platform, { dryRun }) {
  const vars = buildVars(platform, {});
  const targets = getDotfileTargets(platform).filter((t) => t.id.startsWith('vscode-'));
  for (const target of targets) {
    await installDotfile(target, vars, { dryRun });
  }
}

export async function setupVscode(
  platform,
  { dryRun = false, autoYes = false, confirm, set = 'full' } = {}
) {
  const ask = typeof confirm === 'function' ? confirm : async () => true;
  const recommendations = loadRecommendations(set);
  const cli = detectCodeCli();

  log.section(`VS Code setup${set === 'minimal' ? ' (minimal)' : ''}`);
  console.log(
    `  ${c.dim(`${recommendations.length} recommended extensions · settings + keybindings`)}`
  );
  console.log(`  ${c.dim('Existing settings/keybindings are backed up with a .bak suffix.')}\n`);

  const yes =
    autoYes ||
    dryRun ||
    (await ask('Set up VS Code with recommended extensions and settings?', true));
  if (!yes) {
    log.skip('Skipped VS Code setup.');
    return;
  }

  if (!cli) {
    log.warn('VS Code CLI (`code`) not found on PATH — skipping extension install.');
    log.info(
      'Install VS Code first (e.g. `devsetup --essentials`) or add `code` to PATH via the command palette: "Shell Command: Install \'code\' command in PATH".'
    );
  } else {
    log.info(`Installing ${recommendations.length} extensions via ${c.bold(cli)} ...`);
    const { ok, failed } = installExtensions(cli, recommendations, { dryRun });
    if (!dryRun) log.ok(`Extensions: ${ok} installed${failed ? `, ${failed} failed` : ''}`);
  }

  await applySettings(platform, { dryRun });

  console.log(`\n${c.bold('Next steps:')}`);
  console.log('  1. Restart VS Code to load the new settings, keybindings, and extensions');
  console.log('  2. Review settings at File → Preferences → Settings\n');
}

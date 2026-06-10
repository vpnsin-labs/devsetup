#!/usr/bin/env node

import { createInterface } from 'node:readline/promises';
import { existsSync } from 'node:fs';
import { detectPlatform, ensurePackageManager, buildInstallCmd } from '../lib/platform.js';
import { TOOLS, PROFILES } from '../lib/tools.js';
import { hasCommand, run, log, c } from '../lib/runner.js';

// ── Prompts ──────────────────────────────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout });

async function confirm(message, defaultYes = true) {
  const hint = defaultYes ? 'Y/n' : 'y/N';
  const answer = await rl.question(`  ${message} [${hint}] `);
  if (answer.trim() === '') return defaultYes;
  return answer.trim().toLowerCase().startsWith('y');
}

async function selectChoice(message, choices) {
  console.log(`\n  ${c.bold(message)}`);
  choices.forEach(({ name, description }, i) => {
    console.log(`    ${c.cyan(String(i + 1))}. ${c.bold(name)}  ${c.dim(description)}`);
  });
  const answer = await rl.question(`\n  Enter number [1]: `);
  const idx = parseInt(answer.trim(), 10) - 1;
  const valid = !isNaN(idx) && idx >= 0 && idx < choices.length;
  return choices[valid ? idx : 0].value;
}

// ── Args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const dryRun = has('--dry-run');

if (has('--help') || has('-h')) {
  console.log(`
${c.bold('devsetup')} — developer machine bootstrap

${c.bold('Usage:')}  npx @vpnsin/devsetup [profile] [options]

${c.bold('Profiles:')}
  --web          Node, pnpm, Docker, VS Code
  --mobile       Java, Android Studio, CocoaPods, Flutter
  --backend      Docker, Postgres, Redis, AWS CLI, jq, direnv
  --full-stack   all profiles combined

${c.bold('Options:')}
  --dry-run      print commands without running them
  --help         show this help
`);
  process.exit(0);
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log(`\n${c.bold('devsetup')} ${c.dim('— developer machine bootstrap')}\n`);

const platform = detectPlatform();
log.info(`Platform: ${c.bold(platform)} (${process.arch})`);
if (dryRun) log.warn('Dry-run mode — no changes will be made');

// Select profile
let profileKey = ['web', 'mobile', 'backend', 'full-stack'].find((p) => has(`--${p}`));
if (!profileKey) {
  profileKey = await selectChoice(
    'Which setup profile?',
    Object.entries(PROFILES).map(([value, { name, description }]) => ({ value, name, description }))
  );
}
const profile = PROFILES[profileKey];
console.log(`\n  Profile: ${c.bold(profile.name)} — ${c.dim(profile.description)}\n`);

// Ensure system package manager (Homebrew on macOS)
await ensurePackageManager(platform, { dryRun });

// Gather tools for this profile, filtered to this platform
const tools = profile.ids
  .map((id) => TOOLS.find((t) => t.id === id))
  .filter(Boolean)
  .filter((t) => t.platforms.includes(platform));

if (tools.length === 0) {
  log.warn('No tools available for this profile on the current platform.');
  rl.close();
  process.exit(0);
}

// Install each tool
const installed = [];
const skipped = [];
const alreadyHad = [];

for (const tool of tools) {
  const isInstalled = tool.check ? hasCommand(tool.check) : false;

  if (isInstalled) {
    log.skip(`${tool.name} — already installed`);
    alreadyHad.push(tool.name);
    continue;
  }

  const installSpec = tool.install?.[platform];
  if (!installSpec) {
    log.warn(`${tool.name} — no installer for ${platform}`);
    skipped.push(tool.name);
    continue;
  }

  const cmd = buildInstallCmd(installSpec);
  if (!cmd) {
    log.warn(`${tool.name} — could not build install command`);
    skipped.push(tool.name);
    continue;
  }

  if (tool.optional) {
    const yes = await confirm(`Install ${c.bold(tool.name)}? ${c.dim(tool.description)}`);
    if (!yes) {
      skipped.push(tool.name);
      continue;
    }
  } else {
    log.info(`Installing ${c.bold(tool.name)} (${tool.description})...`);
  }

  try {
    run(cmd, { dryRun });
    log.ok(`${tool.name} installed`);
    installed.push(tool.name);

    const msg = tool.postInstall
      ? typeof tool.postInstall === 'string'
        ? tool.postInstall
        : tool.postInstall[platform]
      : null;
    if (msg) log.warn(msg);
  } catch {
    log.error(`${tool.name} install failed — run manually: ${cmd}`);
    skipped.push(tool.name);
  }
}

// After fnm installs, bootstrap Node LTS if not yet available
const fnmJustInstalled = installed.includes('fnm');
const nodeAvailable = hasCommand('node');

if (fnmJustInstalled || !nodeAvailable) {
  const nodeCmd =
    platform === 'windows'
      ? 'fnm install lts-latest && fnm default lts-latest'
      : 'fnm install lts-latest && fnm default lts-latest';
  log.info('Installing Node.js LTS via fnm...');
  try {
    run(nodeCmd, { dryRun });
    log.ok('Node.js LTS installed');
  } catch {
    log.warn('Could not auto-install Node LTS. Run: fnm install lts-latest');
  }
}

// Offer to run devkit init if package.json exists in cwd
const hasPkgJson = existsSync('package.json');
if (hasPkgJson) {
  const runDevkit = await confirm(
    `Run ${c.cyan('npx @vpnsin/devkit init')} to set up project tooling in this directory?`,
    false
  );
  if (runDevkit) {
    try {
      run('npx @vpnsin/devkit init', { dryRun });
    } catch {
      log.warn('devkit init failed — run it manually: npx @vpnsin/devkit init');
    }
  }
}

// Summary
console.log(`\n${c.bold('─'.repeat(52))}`);
if (alreadyHad.length) log.skip(`Already had: ${alreadyHad.join(', ')}`);
if (installed.length) log.ok(`Installed:   ${installed.join(', ')}`);
if (skipped.length) log.warn(`Skipped:     ${skipped.join(', ')}`);

console.log(`
${c.bold('Next steps:')}
  1. Restart your terminal so shell profile changes take effect
  2. In each project: ${c.cyan('npx @vpnsin/devkit init')}
`);

rl.close();

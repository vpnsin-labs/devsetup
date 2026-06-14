#!/usr/bin/env node

import { createInterface } from 'node:readline/promises';
import { existsSync } from 'node:fs';
import { detectPlatform, ensurePackageManager, buildInstallCmd } from '../lib/platform.js';
import { TOOLS, PROFILES } from '../lib/tools.js';
import { hasCommand, run, log, c } from '../lib/runner.js';

// ── Prompts ──────────────────────────────────────────────────────────────────
const isInteractive = Boolean(process.stdin.isTTY);
const rl = createInterface({ input: process.stdin, output: process.stdout });

async function confirm(message, defaultYes = true) {
  if (!isInteractive) return defaultYes;
  const hint = defaultYes ? 'Y/n' : 'y/N';
  const answer = await rl.question(`  ${message} [${hint}] `);
  if (answer.trim() === '') return defaultYes;
  return answer.trim().toLowerCase().startsWith('y');
}

async function ask(message, defaultValue = '') {
  if (!isInteractive) return defaultValue;
  const hint = defaultValue ? ` (${c.dim(defaultValue)})` : '';
  const answer = await rl.question(`  ${c.cyan('?')} ${message}${hint}: `);
  return answer.trim() || defaultValue;
}

async function selectChoice(message, choices) {
  if (!isInteractive) return choices[0].value;
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
const argAfter = (f) => {
  const i = argv.indexOf(f);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
};
const dryRun = has('--dry-run');
const autoYes = has('--yes') || has('-y');
const noOptional = has('--no-optional');

if (has('--help') || has('-h')) {
  console.log(`
${c.bold('devsetup')} — developer machine bootstrap

${c.bold('Usage:')}  npx @vpnsin-lab/devsetup [command|profile] [options]

${c.bold('Tool profiles:')}
  --js           git, fnm, Node.js LTS, pnpm, VS Code, GitHub CLI
  --web          JS tools + Docker, Supabase, MongoDB, Postman
  --mobile       Xcode CLI, Java, Android Studio, CocoaPods, Flutter
  --backend      Docker, MongoDB, Supabase, Postgres, Redis, Kubernetes, AWS CLI
  --devops       Docker, Kubernetes (kubectl, minikube, helm, k9s), AWS CLI
  --full-stack   everything above combined

${c.bold('Dotfiles & docs:')}
  --dotfiles     install .gitconfig, .npmrc, .zshrc, VS Code settings, Gradle config
  --docs [dir]   generate setup documentation into [dir] (default: ./docs)

${c.bold('Options:')}
  --yes, -y      auto-confirm all optional tool prompts
  --no-optional  skip all optional tools (required tools only)
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
if (autoYes) log.info('Auto-yes mode — all optional tools will be installed');
if (noOptional) log.info('No-optional mode — only required tools will be installed');

// ── Dotfiles command ──────────────────────────────────────────────────────────
if (has('--dotfiles')) {
  const { getDotfileTargets, buildVars, installDotfile } = await import('../lib/dotfiles.js');

  log.section('Dotfile setup');
  console.log(`  ${c.dim('Existing files will be backed up with a .bak suffix.')}\n`);

  const gitName = await ask('Your full name (for .gitconfig)');
  const gitEmail = await ask('Your work email (for .gitconfig)');
  const proxyUrl = await ask('Corporate proxy URL (leave blank if none)');
  const zscalerCert = await ask('Zscaler CA cert path (leave blank if none)');

  const vars = buildVars(platform, { gitName, gitEmail, proxyUrl, zscalerCert });
  const targets = getDotfileTargets(platform);

  console.log('');
  for (const target of targets) {
    const yes =
      autoYes ||
      (await confirm(`Install ${c.bold(target.label)}? ${c.dim(target.description)}`, false));
    if (yes) {
      await installDotfile(target, vars, { dryRun });
    } else {
      log.skip(`Skipped: ${target.label}`);
    }
  }

  console.log(`\n${c.bold('─'.repeat(52))}`);
  console.log(`\n${c.bold('Next steps:')}`);
  console.log(`  1. Restart your terminal for shell file changes to take effect`);
  console.log(`  2. Review each installed file and customise as needed\n`);
  rl.close();
  process.exit(0);
}

// ── Docs command ──────────────────────────────────────────────────────────────
if (has('--docs')) {
  const { generateDocs } = await import('../lib/docs.js');
  const outputDir = argAfter('--docs') ?? 'docs';

  log.section(`Generating documentation → ${c.bold(outputDir)}/`);
  const count = generateDocs(outputDir, { dryRun });
  log.ok(`Generated ${count} documentation files in ${c.bold(outputDir)}/`);
  console.log(`\n  ${c.dim('Topics:')} macbook-setup, windows-setup, proxy-setup,`);
  console.log(
    `  ${c.dim('         ')} repository-cloning, environment-settings, azure-vpn-setup, utility-scripts\n`
  );
  rl.close();
  process.exit(0);
}

// Select profile
let profileKey = ['js', 'web', 'mobile', 'backend', 'devops', 'full-stack'].find((p) =>
  has(`--${p}`)
);
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
    if (noOptional) {
      skipped.push(tool.name);
      continue;
    }
    const yes =
      autoYes || (await confirm(`Install ${c.bold(tool.name)}? ${c.dim(tool.description)}`, false));
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
  const nodeCmd = 'fnm install lts-latest && fnm default lts-latest';
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

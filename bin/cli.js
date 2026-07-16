#!/usr/bin/env node

import { createInterface } from 'node:readline/promises';
import { existsSync } from 'node:fs';
import {
  detectPlatform,
  ensurePackageManager,
  buildInstallCmd,
  detectManagers,
  chooseCandidates,
  managerKeyOf,
} from '../lib/platform.js';
import { TOOLS, PROFILES } from '../lib/tools.js';
import { hasCommand, run, log, c } from '../lib/runner.js';

// Resolve a tool's post-install note for the current platform (string or map).
function postInstallNote(tool, platform) {
  if (!tool.postInstall) return null;
  if (typeof tool.postInstall === 'string') return tool.postInstall;
  return tool.postInstall[platform] ?? null;
}

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

${c.bold('Usage:')}  npx @vpnsin-labs/devsetup [command|profile] [options]

${c.bold('New to this?')}  ${c.dim('Start here:')}
  ${c.cyan('npx @vpnsin-labs/devsetup --bootcamp')}   ${c.dim('install the basics')}
  ${c.cyan('npx @vpnsin-labs/devsetup --doctor')}     ${c.dim('check it worked')}

${c.bold('Tool profiles:')}
  --essentials   everyday laptop apps — VS Code, Notepad++, Chrome, GitHub, 7-Zip, VLC, PowerToys
  --bootcamp     first-time setup — Git, Node.js, VS Code, Ollama, Postman
  --js           git, fnm, Node.js LTS, pnpm, VS Code, GitHub CLI
  --web          JS tools + Docker, Supabase, MongoDB, Postman
  --mobile       Xcode CLI, Java, Android Studio, CocoaPods, Flutter
  --backend      Docker, MongoDB, Supabase, Postgres, Redis, Kubernetes, AWS CLI
  --devops       Docker, Kubernetes (kubectl, minikube, helm, k9s), AWS CLI
  --full-stack   everything above combined

${c.bold('Check & fix:')}
  --doctor       diagnose your setup and print a fix for anything broken
                 ${c.dim('pair with a profile, e.g. --doctor --bootcamp')}
  --identity     set your Git name and email (just the two lines, nothing else)

${c.bold('Dotfiles & docs:')}
  --dotfiles     install .gitconfig, .npmrc, .zshrc, VS Code settings, Gradle config
  --docs [dir]   generate setup documentation into [dir] (default: ./docs)
                 ${c.dim('--docs --bootcamp writes beginner guides instead')}
  --edge         set up Microsoft Edge with a curated extensions/settings/bookmarks baseline
  --vscode       install recommended VS Code extensions + settings and keybindings
                 ${c.dim('--vscode --minimal installs just 4 essentials')}

${c.bold('Options:')}
  --yes, -y      auto-confirm all optional tool prompts
  --no-optional  skip all optional tools (required tools only)
  --corporate    ask for corporate proxy/CA cert details in --dotfiles
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

// ── Doctor command ────────────────────────────────────────────────────────────
// Read-only: diagnoses the machine and exits non-zero if a required check
// fails, so it doubles as a pre-flight in CI or a workshop.
if (has('--doctor')) {
  const { runDoctor, CHECKLISTS } = await import('../lib/doctor.js');
  const { loadRecommendations } = await import('../lib/vscode.js');

  const checklist =
    Object.keys(CHECKLISTS).find((k) => k !== 'default' && has(`--${k}`)) ?? 'default';
  const extensions = checklist === 'bootcamp' ? loadRecommendations('minimal') : [];

  const { blockers } = runDoctor({ checklist, extensions });
  rl.close();
  process.exit(blockers > 0 ? 1 : 0);
}

// ── Identity command ──────────────────────────────────────────────────────────
// Just the two lines of git config everyone needs, without the full --dotfiles
// rewrite of shell profiles, npmrc and Gradle.
if (has('--identity')) {
  log.section('Git identity');
  console.log(`  ${c.dim('Every commit you make is signed with this name and email.')}\n`);

  const current = { name: null, email: null };
  if (hasCommand('git')) {
    const { capture } = await import('../lib/runner.js');
    current.name = capture('git', ['config', '--global', 'user.name']);
    current.email = capture('git', ['config', '--global', 'user.email']);
  } else {
    log.warn('Git is not installed yet — run `devsetup --bootcamp` first.');
    rl.close();
    process.exit(1);
  }

  const gitName = await ask('Your full name', current.name ?? '');
  const gitEmail = await ask('Your email (use your GitHub one)', current.email ?? '');

  if (!gitName || !gitEmail) {
    log.warn('Both a name and an email are needed — nothing changed.');
    rl.close();
    process.exit(1);
  }

  console.log('');
  run(`git config --global user.name "${gitName}"`, { dryRun });
  run(`git config --global user.email "${gitEmail}"`, { dryRun });
  log.ok(`Git identity set to ${c.bold(gitName)} <${gitEmail}>`);
  console.log(
    `\n  ${c.dim('Tip: use the same email as your GitHub account, or your commits')}\n  ${c.dim("won't link to your profile.")}\n`
  );
  rl.close();
  process.exit(0);
}

// ── Dotfiles command ──────────────────────────────────────────────────────────
if (has('--dotfiles')) {
  const { getDotfileTargets, buildVars, installDotfile } = await import('../lib/dotfiles.js');

  log.section('Dotfile setup');
  console.log(`  ${c.dim('Existing files will be backed up with a .bak suffix.')}\n`);

  const gitName = await ask('Your full name (for .gitconfig)');
  const gitEmail = await ask('Your email (for .gitconfig)');
  const proxyUrl = await ask('Proxy URL, if your network uses one (leave blank if none)');
  // A CA cert path is a corporate concern. Asking a first-timer for one is
  // noise, so only surface it when a proxy was given or --corporate is passed.
  const zscalerCert =
    proxyUrl || has('--corporate') ? await ask('Zscaler CA cert path (leave blank if none)') : '';

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
  const { generateDocs, listDocs } = await import('../lib/docs.js');
  const outputDir = argAfter('--docs') ?? 'docs';
  const docSet = has('--bootcamp') ? 'bootcamp' : 'default';

  log.section(`Generating documentation → ${c.bold(outputDir)}/`);
  const count = generateDocs(outputDir, { dryRun, set: docSet });
  log.ok(`Generated ${count} documentation files in ${c.bold(outputDir)}/`);
  const topics = listDocs(docSet);
  if (topics.length) console.log(`\n  ${c.dim('Topics:')} ${topics.join(', ')}\n`);
  rl.close();
  process.exit(0);
}

// ── Edge baseline command ─────────────────────────────────────────────────────
if (has('--edge')) {
  const { setupEdge } = await import('../lib/edge.js');
  await setupEdge(platform, { dryRun, autoYes, confirm });
  rl.close();
  process.exit(0);
}

// ── VS Code setup command ──────────────────────────────────────────────────────
if (has('--vscode')) {
  const { setupVscode } = await import('../lib/vscode.js');
  const set = has('--minimal') ? 'minimal' : 'full';
  await setupVscode(platform, { dryRun, autoYes, confirm, set });
  rl.close();
  process.exit(0);
}

// Select profile
let profileKey = [
  'essentials',
  'bootcamp',
  'js',
  'web',
  'mobile',
  'backend',
  'devops',
  'full-stack',
].find((p) => has(`--${p}`));
if (!profileKey) {
  profileKey = await selectChoice(
    'Which setup profile?',
    Object.entries(PROFILES).map(([value, { name, description }]) => ({ value, name, description }))
  );
}
const profile = PROFILES[profileKey];
console.log(`\n  Profile: ${c.bold(profile.name)} — ${c.dim(profile.description)}\n`);

// Ensure a usable package manager (Homebrew on macOS; offer Scoop on Windows
// when none is present). Detect which managers are available for fallback.
await ensurePackageManager(platform, { dryRun, autoYes, confirm });
const managers = detectManagers(platform);

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

  const spec = tool.install?.[platform];
  if (!spec) {
    log.warn(`${tool.name} — no installer for ${platform}`);
    skipped.push(tool.name);
    continue;
  }

  // Build the ordered list of install methods that are actually runnable on
  // this machine. Empty means every candidate's package manager is missing.
  const candidates = chooseCandidates(spec, managers);
  if (candidates.length === 0) {
    log.warn(
      `${tool.name} — no available package manager for ${platform} (install methods unavailable)`
    );
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

  const note = postInstallNote(tool, platform);

  // Dry-run: print the full ordered plan instead of executing anything.
  if (dryRun) {
    candidates.forEach((candidate, i) => {
      const tag = i === 0 ? 'primary' : `fallback ${i}`;
      log.info(
        `would try (${tag}, ${managerKeyOf(candidate)}): ${c.cyan(buildInstallCmd(candidate))}`
      );
    });
    log.ok(`${tool.name} planned`);
    installed.push(tool.name);
    if (note) log.warn(note);
    continue;
  }

  // Try each method in order; the first one that exits cleanly wins. We trust
  // the installer's exit code rather than re-probing the command afterwards —
  // most managers (winget/scoop/choco/snap, curl-to-~/.local scripts) only put
  // the new binary on PATH for *future* shells, so a same-process check would
  // false-fail a successful install. A non-zero exit throws and falls through.
  let succeeded = false;
  let lastCmd = null;
  const tried = [];
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const cmd = buildInstallCmd(candidate);
    if (!cmd) continue;
    const key = managerKeyOf(candidate);
    lastCmd = cmd;
    tried.push(key);
    if (i > 0) log.info(`Trying alternative for ${c.bold(tool.name)} via ${key}...`);
    try {
      run(cmd, { dryRun });
      succeeded = true;
      break;
    } catch {
      log.warn(`${tool.name}: install via ${key} failed — trying next method...`);
    }
  }

  if (succeeded) {
    log.ok(`${tool.name} installed`);
    installed.push(tool.name);
    if (note) log.warn(note);
  } else {
    log.error(
      `${tool.name} install failed — all methods exhausted (tried: ${tried.join(', ')}). Run manually: ${lastCmd}`
    );
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
    `Run ${c.cyan('npx @vpnsin-labs/devkit init')} to set up project tooling in this directory?`,
    false
  );
  if (runDevkit) {
    try {
      run('npx @vpnsin-labs/devkit init', { dryRun });
    } catch {
      log.warn('devkit init failed — run it manually: npx @vpnsin-labs/devkit init');
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
  2. In each project: ${c.cyan('npx @vpnsin-labs/devkit init')}
`);

rl.close();

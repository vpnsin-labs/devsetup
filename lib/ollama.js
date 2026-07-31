import { TOOLS } from './tools.js';
import { hasCommand, run, log, c } from './runner.js';
import {
  ensurePackageManager,
  detectManagers,
  chooseCandidates,
  buildInstallCmd,
  managerKeyOf,
} from './platform.js';

// Ollama is a normal entry in the tool catalogue — its install spec and `check`
// live in TOOLS. The standalone `--ollama` command installs just that one tool,
// reusing platform.js's ordered-fallback installer (like edge.js's installEdge),
// preceded by the profile loop's ensurePackageManager bootstrap. It is
// deliberately its own command rather than a profile, so local-AI tooling stays
// strictly opt-in: it never shows up in the interactive profile menu and never
// triggers the profile loop's fnm/Node-LTS bootstrap. The "pull a model" hint
// shown after install is defined here in nextSteps(), not read from the catalogue.
const OLLAMA = TOOLS.find((t) => t.id === 'ollama');

function nextSteps() {
  console.log(`\n${c.bold('Next steps:')}`);
  console.log(
    `  1. Pull a model: ${c.cyan('ollama pull llama3')}  ${c.dim('(~4.7GB — do this on fast wifi)')}`
  );
  console.log(`  2. Chat with it: ${c.cyan('ollama run llama3')}\n`);
}

export async function setupOllama(platform, { dryRun = false, autoYes = false, confirm } = {}) {
  const ask = typeof confirm === 'function' ? confirm : async () => true;

  log.section('Ollama — run AI models locally');
  console.log(`  ${c.dim('Installs the Ollama runtime; models are pulled separately.')}\n`);

  if (!OLLAMA) {
    log.error('Ollama is missing from the tool catalogue — cannot continue.');
    return;
  }

  if (!OLLAMA.platforms.includes(platform)) {
    log.warn(
      `No Ollama installer for ${platform}. Install it manually: https://ollama.com/download`
    );
    return;
  }

  // Already on PATH? Don't reinstall — just show how to use it.
  if (OLLAMA.check && hasCommand(OLLAMA.check)) {
    log.skip('Ollama — already installed');
    nextSteps();
    return;
  }

  const yes = autoYes || dryRun || (await ask('Install Ollama?', true));
  if (!yes) {
    log.skip('Skipped Ollama.');
    return;
  }

  // The same bootstrap a profile run does: Homebrew on macOS, an offer of Scoop
  // on Windows when no manager is present. Linux only warns.
  await ensurePackageManager(platform, { dryRun, autoYes, confirm });
  const managers = detectManagers(platform);

  const candidates = chooseCandidates(OLLAMA.install?.[platform], managers);
  if (candidates.length === 0) {
    log.warn(
      `Ollama — no available package manager for ${platform}. Install it manually: https://ollama.com/download`
    );
    return;
  }

  // Dry-run: print the full ordered plan instead of executing anything.
  if (dryRun) {
    candidates.forEach((cand, i) => {
      const tag = i === 0 ? 'primary' : `fallback ${i}`;
      log.info(`would try (${tag}, ${managerKeyOf(cand)}): ${c.cyan(buildInstallCmd(cand))}`);
    });
    log.ok('Ollama planned');
    nextSteps();
    return;
  }

  // Try each runnable method in order; the first one that exits cleanly wins.
  let succeeded = false;
  let lastCmd = null;
  const tried = [];
  for (const cand of candidates) {
    const cmd = buildInstallCmd(cand);
    if (!cmd) continue;
    const key = managerKeyOf(cand);
    lastCmd = cmd;
    tried.push(key);
    if (tried.length > 1) log.info(`Trying alternative for ${c.bold('Ollama')} via ${key}...`);
    try {
      run(cmd, { dryRun });
      succeeded = true;
      break;
    } catch {
      log.warn(`Ollama: install via ${key} failed — trying next method...`);
    }
  }

  if (!succeeded) {
    log.error(
      `Ollama install failed — all methods exhausted (tried: ${tried.join(', ')}). Run manually: ${lastCmd}`
    );
    return;
  }

  log.ok('Ollama installed');
  nextSteps();
}

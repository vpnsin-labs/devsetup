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

export async function ensurePackageManager(platform, { dryRun }) {
  if (platform === 'macos' && !hasCommand('brew')) {
    log.info('Installing Homebrew (this may take a few minutes)...');
    run(
      '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
      { dryRun }
    );
  }
  // linux: apt assumed present on Ubuntu/Debian
  // windows: winget assumed present on Windows 10 1709+
}

export function buildInstallCmd(spec) {
  if (!spec) return null;
  if (spec.brew) return `brew install ${spec.brew}`;
  if (spec.cask) return `brew install --cask ${spec.cask}`;
  if (spec.apt) return `sudo apt-get install -y ${spec.apt}`;
  if (spec.snap) return `sudo snap install ${spec.snap}`;
  if (spec.winget) return `winget install --silent --id ${spec.winget}`;
  if (spec.npm) return `npm install -g ${spec.npm}`;
  if (spec.script) return spec.script;
  return null;
}

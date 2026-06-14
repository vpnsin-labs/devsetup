import { homedir } from 'node:os';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from './runner.js';

const HOME = homedir();
const TEMPLATES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'dotfiles');

function vscodeUserDir(platform) {
  if (platform === 'macos') return join(HOME, 'Library', 'Application Support', 'Code', 'User');
  if (platform === 'windows') return join(process.env.APPDATA ?? HOME, 'Code', 'User');
  return join(HOME, '.config', 'Code', 'User');
}

export function getDotfileTargets(platform) {
  const gradle = join(HOME, '.gradle');
  const vscode = vscodeUserDir(platform);

  const all = [
    {
      id: 'gitconfig',
      src: '.gitconfig',
      dest: join(HOME, '.gitconfig'),
      label: '~/.gitconfig',
      description: 'Git identity, aliases, credential helper, optional proxy',
    },
    {
      id: 'gitignore',
      src: '.gitignore_global',
      dest: join(HOME, '.gitignore'),
      label: '~/.gitignore (global)',
      description: 'Global patterns ignored in every repo (macOS, Node, IDE, env files)',
    },
    {
      id: 'npmrc',
      src: '.npmrc',
      dest: join(HOME, '.npmrc'),
      label: '~/.npmrc',
      description: 'npm registry, audit level, optional Zscaler proxy/cert',
    },
    {
      id: 'gradle-props',
      src: 'gradle.properties',
      dest: join(gradle, 'gradle.properties'),
      label: '~/.gradle/gradle.properties',
      description: 'JVM memory, daemon, build caching, optional corporate proxy',
    },
    {
      id: 'init-gradle',
      src: 'init.gradle',
      dest: join(gradle, 'init.gradle'),
      label: '~/.gradle/init.gradle',
      description: 'Gradle init script (enterprise repo mirrors, build settings)',
    },
    {
      id: 'vscode-settings',
      src: 'vscode/settings.json',
      dest: join(vscode, 'settings.json'),
      label: 'VS Code user settings.json',
      description: 'Format on save, font, theme, git auto-fetch, optional proxy',
    },
    {
      id: 'vscode-keybindings',
      src: 'vscode/keybindings.json',
      dest: join(vscode, 'keybindings.json'),
      label: 'VS Code keybindings.json',
      description: 'Keyboard shortcuts for terminal, sidebar, and editor actions',
    },
  ];

  if (platform === 'macos' || platform === 'linux') {
    all.push(
      {
        id: 'zprofile',
        src: '.zprofile',
        dest: join(HOME, '.zprofile'),
        label: '~/.zprofile',
        description: 'Homebrew, fnm, and PATH setup for login shells (macOS)',
      },
      {
        id: 'zshrc',
        src: '.zshrc',
        dest: join(HOME, '.zshrc'),
        label: '~/.zshrc',
        description: 'Aliases, direnv/fnm hooks, proxy toggle helpers',
      }
    );
  }

  return all;
}

// Build template variables from user inputs + platform context
export function buildVars(platform, { gitName, gitEmail, proxyUrl, zscalerCert }) {
  const hasProxy = Boolean(proxyUrl);
  const hasCert = Boolean(zscalerCert);

  const credentialHelper =
    platform === 'macos'
      ? 'osxkeychain'
      : platform === 'windows'
        ? 'manager'
        : 'cache --timeout=3600';

  const proxyBlock = hasProxy
    ? `[http]\n\tproxy = ${proxyUrl}\n[https]\n\tproxy = ${proxyUrl}`
    : `# [http]\n# \tproxy = http://proxy.company.com:80\n# [https]\n# \tproxy = http://proxy.company.com:80`;

  const certBlock = hasCert
    ? `[http]\n\tsslCAInfo = ${zscalerCert}`
    : `# [http]\n# \tsslCAInfo = /path/to/zscaler-ca.pem`;

  const proxyNpmLines = hasProxy
    ? `proxy=${proxyUrl}\nhttps-proxy=${proxyUrl}`
    : `# proxy=http://proxy.company.com:80\n# https-proxy=http://proxy.company.com:80`;

  const certNpmLine = hasCert ? `cafile=${zscalerCert}` : `# cafile=/path/to/zscaler-ca.pem`;

  const proxyGradleLines = hasProxy
    ? [
        `systemProp.http.proxyHost=${new URL(proxyUrl).hostname}`,
        `systemProp.http.proxyPort=${new URL(proxyUrl).port || '80'}`,
        `systemProp.https.proxyHost=${new URL(proxyUrl).hostname}`,
        `systemProp.https.proxyPort=${new URL(proxyUrl).port || '80'}`,
        `systemProp.http.nonProxyHosts=localhost|127.0.0.1|*.internal`,
      ].join('\n')
    : [
        `# systemProp.http.proxyHost=proxy.company.com`,
        `# systemProp.http.proxyPort=80`,
        `# systemProp.https.proxyHost=proxy.company.com`,
        `# systemProp.https.proxyPort=80`,
        `# systemProp.http.nonProxyHosts=localhost|127.0.0.1|*.internal`,
      ].join('\n');

  const proxyVscodeLines = hasProxy
    ? `"http.proxy": "${proxyUrl}",\n    "http.proxyStrictSSL": ${!hasCert},`
    : `// "http.proxy": "http://proxy.company.com:80",\n    // "http.proxyStrictSSL": false,`;

  const proxyShellLines = hasProxy
    ? `export http_proxy="${proxyUrl}"\nexport https_proxy="${proxyUrl}"\nexport no_proxy="localhost,127.0.0.1,.internal"`
    : `# export http_proxy="http://proxy.company.com:80"\n# export https_proxy="http://proxy.company.com:80"\n# export no_proxy="localhost,127.0.0.1,.internal"`;

  return {
    GIT_NAME: gitName || 'Your Name',
    GIT_EMAIL: gitEmail || 'you@example.com',
    GIT_CREDENTIAL_HELPER: credentialHelper,
    GIT_PROXY_BLOCK: proxyBlock,
    GIT_CERT_BLOCK: certBlock,
    NPM_PROXY_LINES: proxyNpmLines,
    NPM_CERT_LINE: certNpmLine,
    GRADLE_PROXY_LINES: proxyGradleLines,
    VSCODE_PROXY_LINES: proxyVscodeLines,
    SHELL_PROXY_LINES: proxyShellLines,
    HOME,
  };
}

function applyVars(content, vars) {
  return Object.entries(vars).reduce(
    (str, [key, val]) => str.replaceAll(`{{${key}}}`, val ?? ''),
    content
  );
}

export async function installDotfile(target, vars, { dryRun = false } = {}) {
  const src = join(TEMPLATES_DIR, target.src);
  if (!existsSync(src)) {
    log.warn(`Template missing: ${target.src} — skipping`);
    return false;
  }

  const destDir = dirname(target.dest);
  if (!existsSync(destDir)) {
    if (!dryRun) mkdirSync(destDir, { recursive: true });
    log.info(`Created directory: ${destDir}`);
  }

  if (existsSync(target.dest)) {
    const backup = `${target.dest}.bak`;
    if (!dryRun) renameSync(target.dest, backup);
    log.info(`Backed up existing → ${target.dest}.bak`);
  }

  const raw = readFileSync(src, 'utf8');
  const content = applyVars(raw, vars);
  if (!dryRun) writeFileSync(target.dest, content, 'utf8');
  log.ok(`Installed ${target.label}`);
  return true;
}

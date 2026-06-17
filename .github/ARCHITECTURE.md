# Architecture

This document explains how devsetup works internally — module responsibilities, data
models, and how to extend the tool catalogue, profiles, dotfiles, and documentation.

---

## Overview

devsetup is a zero-dependency Node.js CLI (ESM, Node ≥ 18.18). No bundler. No
runtime framework. The published package contains only `bin/`, `lib/`, and
`templates/`. Everything else (`eslint.config.ts`, `tsconfig.json`, `.husky/`, etc.)
is development tooling that stays out of the published artifact.

```
npx @vpnsin-labs/devsetup [flags]
         │
         ▼
    bin/cli.js          ← entry point, flag parsing, interactive prompts
         │
         ├── lib/tools.js        ← tool catalogue + profile definitions (pure data)
         ├── lib/platform.js     ← OS detection, package-manager bootstrapping
         ├── lib/runner.js       ← shell execution, command-detection, coloured output
         ├── lib/dotfiles.js     ← template rendering + file installation
         └── lib/docs.js         ← documentation file generation
                │
                └── templates/
                      ├── dotfiles/   ← source templates for --dotfiles
                      └── docs/       ← markdown guides copied by --docs
```

---

## Module reference

### `bin/cli.js`

Entry point. Responsibilities:

- Parses `process.argv` (no third-party arg parser — uses `argv.includes` and an
  `argAfter` helper).
- Detects interactive mode via `process.stdin.isTTY`; falls back to defaults when
  piped or in CI.
- Handles three top-level modes, each exiting early after completion:
  1. `--help` — prints usage and exits.
  2. `--dotfiles` — delegates to `lib/dotfiles.js` after collecting user inputs.
  3. `--docs` — delegates to `lib/docs.js`.
  4. _(default)_ — profile selection → tool installation loop.
- After tool installation, auto-bootstraps Node.js LTS via fnm if fnm was just
  installed or `node` is not yet on PATH.
- Offers to run `npx @vpnsin-labs/devkit init` if a `package.json` exists in the current
  working directory.

Key flags and their effects:

| Flag                                        | Variable     | Effect                                               |
| ------------------------------------------- | ------------ | ---------------------------------------------------- |
| `--yes` / `-y`                              | `autoYes`    | Skips all optional-tool prompts, auto-accepts        |
| `--no-optional`                             | `noOptional` | Skips optional tools entirely without prompting      |
| `--dry-run`                                 | `dryRun`     | Prints every command with `$` prefix, never executes |
| `--js/web/mobile/backend/devops/full-stack` | `profileKey` | Selects profile without interactive prompt           |

---

### `lib/tools.js`

Pure data — no I/O. Exports `TOOLS` (array) and `PROFILES` (object).

**Tool entry shape:**

```js
{
  id: 'docker',                       // unique identifier, used in PROFILES.ids
  name: 'Docker',                     // display name
  description: 'container platform',  // one-liner shown in prompts
  check: 'docker',                    // command probed with which/where; null = no check
  optional: true,                     // false = always install; true = prompt user
  platforms: ['macos', 'linux', 'windows'], // platforms where this tool is available
  install: {
    macos:   { cask: 'docker' },
    linux:   { script: 'curl -fsSL https://get.docker.com | sh ...' },
    windows: { winget: 'Docker.DockerDesktop' },
  },
  postInstall: {                       // optional; shown after install as a warning
    macos:   'Open Docker.app to complete setup.',
    windows: 'Open Docker Desktop to complete setup.',
    linux:   'Log out and back in for docker group membership to take effect.',
  },
}
```

`postInstall` can also be a plain string (shown on all platforms):

```js
postInstall: 'Start your cluster: minikube start';
```

**Install spec keys** (only one is used per platform entry, in priority order as
resolved by `lib/platform.js → buildInstallCmd`):

| Key      | Expands to                                                          |
| -------- | ------------------------------------------------------------------- |
| `brew`   | `brew install <value>`                                              |
| `cask`   | `brew install --cask <value>`                                       |
| `apt`    | `sudo apt-get install -y <value>`                                   |
| `snap`   | `sudo snap install <value>`                                         |
| `winget` | `winget install --silent --id <value>`                              |
| `npm`    | `npm install -g <value>`                                            |
| `script` | Raw shell command (used when the official installer is a curl pipe) |

**Profile entry shape:**

```js
{
  name: 'Web',
  description: 'JS tools + Docker, Supabase, MongoDB, Postman',
  ids: ['git', 'fnm', 'pnpm', 'docker', 'mongodb', ...],
}
```

`ids` is an ordered list of tool IDs. Tools are installed in this order. Tools not
available on the current platform are silently skipped (filtered by `tool.platforms`).

---

### `lib/platform.js`

Three exports:

- **`detectPlatform()`** — maps `process.platform` (`darwin` → `macos`,
  `linux` → `linux`, `win32` → `windows`, anything else → `linux`).

- **`ensurePackageManager(platform, { dryRun })`** — on macOS, installs Homebrew
  if `brew` is not on PATH. On Linux/Windows, assumes `apt`/`winget` is present.

- **`buildInstallCmd(spec)`** — given one platform's install spec object, returns
  the shell command string (or `null` if the spec is empty/unrecognised). Priority:
  `brew` → `cask` → `apt` → `snap` → `winget` → `npm` → `script`.

---

### `lib/runner.js`

Thin utilities with no external dependencies:

- **`c`** — ANSI colour helpers: `c.green`, `c.yellow`, `c.red`, `c.cyan`,
  `c.dim`, `c.bold`.

- **`log`** — Structured output:

  | Method        | Symbol | Colour | Use                                  |
  | ------------- | ------ | ------ | ------------------------------------ |
  | `log.ok`      | ✔      | green  | Successful install                   |
  | `log.skip`    | •      | dim    | Already installed / user skipped     |
  | `log.info`    | →      | cyan   | Progress update                      |
  | `log.warn`    | !      | yellow | Post-install notes, non-fatal issues |
  | `log.error`   | ✘      | red    | Install failure                      |
  | `log.section` | —      | bold   | Section header                       |

- **`hasCommand(cmd)`** — uses `spawnSync('which'/'where')` to check if a command
  exists; returns boolean. Uses `where` on Windows, `which` elsewhere.

- **`run(cmd, { dryRun })`** — prints the command (always), then calls
  `execSync(cmd, { stdio: 'inherit' })` unless `dryRun` is true.

---

### `lib/dotfiles.js`

Handles `--dotfiles`. Three exports:

**`getDotfileTargets(platform)`** — returns an array of target descriptors:

```js
{
  (id, src, dest, label, description);
}
// src  → relative path within templates/dotfiles/
// dest → absolute path on the user's machine
```

Shell files (`.zprofile`, `.zshrc`) are only added for `macos` and `linux`. All
other targets (gitconfig, gitignore, npmrc, Gradle, VS Code) are cross-platform.

The VS Code user directory resolves to:

- macOS: `~/Library/Application Support/Code/User/`
- Windows: `%APPDATA%\Code\User\`
- Linux: `~/.config/Code/User/`

**`buildVars(platform, { gitName, gitEmail, proxyUrl, zscalerCert })`** — returns a
flat object of `{ KEY: value }` pairs. These are injected into templates at render
time. Every key maps to a `{{KEY}}` placeholder in the template files.

| Variable                | Content when proxy/cert provided                   | Content when blank    |
| ----------------------- | -------------------------------------------------- | --------------------- |
| `GIT_NAME`              | User's full name                                   | `'Your Name'`         |
| `GIT_EMAIL`             | User's work email                                  | `'you@example.com'`   |
| `GIT_CREDENTIAL_HELPER` | `osxkeychain` / `manager` / `cache --timeout=3600` | —                     |
| `GIT_PROXY_BLOCK`       | `[http]\n\tproxy = …`                              | Commented-out example |
| `GIT_CERT_BLOCK`        | `[http]\n\tsslCAInfo = …`                          | Commented-out example |
| `NPM_PROXY_LINES`       | `proxy=…\nhttps-proxy=…`                           | Commented-out example |
| `NPM_CERT_LINE`         | `cafile=…`                                         | Commented-out example |
| `GRADLE_PROXY_LINES`    | `systemProp.http.proxyHost=…` (5 lines)            | Commented-out example |
| `VSCODE_PROXY_LINES`    | `"http.proxy": "…",`                               | Commented-out example |
| `SHELL_PROXY_LINES`     | `export http_proxy=…` (3 lines)                    | Commented-out example |
| `HOME`                  | `os.homedir()`                                     | —                     |

**`installDotfile(target, vars, { dryRun })`** — renders one template and writes it:

1. Reads `templates/dotfiles/<target.src>`.
2. Applies `applyVars()` — replaces every `{{KEY}}` with its value using
   `String.replaceAll`.
3. If the destination file already exists, renames it to `<dest>.bak` (one backup
   kept; subsequent runs overwrite the `.bak`).
4. Creates any missing parent directories (`mkdirSync({ recursive: true })`).
5. Writes the rendered content to `target.dest`.

---

### `lib/docs.js`

Handles `--docs`. Single export:

**`generateDocs(outputDir, { dryRun })`** — reads every `.md` file from
`templates/docs/`, copies each one verbatim (no template variable substitution) to
`outputDir`, creating the directory if needed. Returns the count of files copied.

---

## Adding a new tool

Edit `lib/tools.js`. Add an entry to the `TOOLS` array:

```js
{
  id: 'my-tool',
  name: 'My Tool',
  description: 'one-liner for prompts and help text',
  check: 'mytool',        // the binary to probe; null if no reliable check
  optional: true,         // false if this should always install for profiles that include it
  platforms: ['macos', 'linux', 'windows'],
  install: {
    macos:   { brew: 'my-tool' },          // or { cask: '...' }
    linux:   { apt: 'my-tool' },           // or { script: '...' }
    windows: { winget: 'Publisher.MyTool' },
  },
  // postInstall is optional:
  postInstall: 'Run: my-tool init to complete setup.',
}
```

Then reference the `id` in whichever `PROFILES.ids` arrays should include it. A tool
not listed in any profile is never installed; a tool listed in a profile but not
available on the current platform is silently skipped.

**Platform restriction:** set `platforms` to only the OSes where the tool is
meaningful. For example, `windows-terminal` lists only `['windows']`, and
`cocoapods` lists only `['macos']`.

**No-check tools:** set `check: null` when the tool installs a GUI app with no
reliable CLI binary (e.g. `github-desktop`, `postman`, `mongodb-compass`). These
tools are never skipped as "already installed" — they are always prompted if optional.

---

## Adding a new profile

Edit `lib/profiles` — the `PROFILES` export at the bottom of `lib/tools.js`. Add a
key-value pair:

```js
export const PROFILES = {
  // ... existing profiles ...
  'my-profile': {
    name: 'My Profile', // display name in interactive prompt
    description: 'short summary of what it installs',
    ids: ['git', 'fnm', 'my-tool', 'vscode'], // ordered list of tool IDs
  },
};
```

Then register the profile key in `bin/cli.js` — add it to the `profileKey` detection
array (line ~139):

```js
let profileKey = ['js', 'web', 'mobile', 'backend', 'devops', 'full-stack', 'my-profile'].find(
  (p) => has(`--${p}`)
);
```

And add the flag to the `--help` block and `README.md`.

---

## Adding a new dotfile template

**Step 1 — Create the template** in `templates/dotfiles/`:

- Use `{{KEY}}` placeholders for any value that varies by user or platform.
- Available keys are listed in the `buildVars` table above. Add new keys to
  `buildVars` in `lib/dotfiles.js` if needed.
- Prettier is excluded from the `templates/` directory (via `.prettierignore`) so
  placeholder syntax doesn't break JSON/YAML parsing.

**Step 2 — Register the target** in `getDotfileTargets()` in `lib/dotfiles.js`:

```js
{
  id: 'my-config',
  src: 'my-config.toml',                    // relative to templates/dotfiles/
  dest: join(HOME, '.config', 'my-config'), // absolute destination path
  label: '~/.config/my-config',             // shown in prompts
  description: 'one-liner describing the file',
},
```

For platform-conditional files, add them inside the `if (platform === 'macos' || ...)`
block or a new conditional. The template is automatically presented to the user during
`--dotfiles` in the order it appears in the `all` array.

---

## Adding a new documentation template

Drop a `.md` file into `templates/docs/`. The `generateDocs()` function copies every
`.md` file in that directory verbatim — no further registration needed.

Add the file name and a description to the `--docs` table in `README.md`.

Templates in `templates/docs/` are also linted by markdownlint-cli2 on every commit
(pre-commit hook). Fenced code blocks need a language tag (`bash`, `powershell`,
`text`, `json`, etc.) to satisfy MD040.

---

## Template variable system

The `{{KEY}}` substitution is intentionally minimal — a single `String.replaceAll`
pass per variable, applied in iteration order of the `vars` object. There is no
escaping, conditional logic, or looping syntax. All conditional content (proxy lines,
cert paths) is handled in JavaScript inside `buildVars`, which returns pre-rendered
strings for each variable.

If a placeholder is present in the template but absent from `vars`, it is left as-is
(the `?? ''` fallback in `applyVars` only triggers for `null`/`undefined` values from
the object). This means unknown placeholders silently survive in the output — add
every placeholder to `buildVars` or the output file will contain raw `{{…}}` text.

---

## CI / release pipeline

```
push to main
    │
    ▼
ci.yml ──── lint (ESLint + markdownlint) + type-check + format-check
    │
    ▼
release-please.yml
    │
    ├── release-please-action  ←── reads Conventional Commits since last tag
    │         │                    updates CHANGELOG.md, bumps package.json version
    │         │                    opens / updates a release PR
    │         │
    │    (release PR merged by maintainer)
    │         │
    │         ▼
    └── publishes GitHub release + tag
              │
              ▼
         npm publish --provenance --access public
              └── NODE_AUTH_TOKEN = secrets.NPM_TOKEN (org-level secret)
```

Version bump rules (from `release-please-config.json`):

| Commit prefix                         | Bump                                                                  |
| ------------------------------------- | --------------------------------------------------------------------- |
| `feat:`                               | minor (while `< 1.0`, because `bump-minor-pre-major: true`)           |
| `fix:`                                | patch (while `< 1.0`, because `bump-patch-for-minor-pre-major: true`) |
| `feat!:` or `BREAKING CHANGE:` footer | major                                                                 |
| All others                            | no release                                                            |

`npm publish` uses npm provenance (`--provenance`), which requires the `id-token: write`
permission in the workflow and links the published package to the specific GitHub
Actions run that produced it. Consumers can verify the provenance on npmjs.com.

---

## Local development

```bash
git clone https://github.com/vpnsin-labs/devsetup
cd devsetup
npm install          # installs dev deps + registers Husky hooks

# Run the CLI locally (reads from your local bin/cli.js)
node bin/cli.js --help
node bin/cli.js --dry-run --web
node bin/cli.js --dotfiles --dry-run
node bin/cli.js --docs /tmp/my-docs

# Quality checks (all run automatically on commit via lint-staged)
npm run lint         # ESLint
npm run lint:md      # markdownlint-cli2
npm run format:check # Prettier
npm run type-check   # tsc --noEmit (type annotations in .ts config files)
```

There are no unit tests today. The `npm test` script is a no-op (CI skips it with
`--if-present`). Contributions adding tests are welcome.

**Dry-run** is the primary way to verify changes without affecting your machine:

```bash
node bin/cli.js --dry-run --full-stack
# prints every install command without executing any of them
```

---

## File conventions

| Path                            | Purpose                                                           |
| ------------------------------- | ----------------------------------------------------------------- |
| `bin/cli.js`                    | CLI entry (shebang + ESM; this is what `npx` runs)                |
| `lib/*.js`                      | Pure logic modules, imported by `bin/cli.js`                      |
| `templates/dotfiles/`           | Source templates for `--dotfiles`; contain `{{KEY}}` placeholders |
| `templates/docs/`               | Markdown guide sources for `--docs`; copied verbatim              |
| `.github/workflows/`            | CI quality checks + release-please automation                     |
| `release-please-config.json`    | Controls version bump strategy and changelog path                 |
| `.release-please-manifest.json` | Tracks the current released version (managed by the action)       |
| `.nvmrc`                        | Node.js version used in CI (`node-version-file` in setup-node)    |
| `cspell.json`                   | Spell-check dictionary for project-specific terms                 |
| `.prettierignore`               | Excludes `templates/` so placeholder syntax isn't reformatted     |

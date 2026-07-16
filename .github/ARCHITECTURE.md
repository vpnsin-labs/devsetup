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
- Handles several top-level modes, each exiting early after completion:
  1. `--help` — prints usage and exits.
  2. `--dotfiles` — delegates to `lib/dotfiles.js` after collecting user inputs.
  3. `--docs` — delegates to `lib/docs.js`.
  4. `--edge` — delegates to `lib/edge.js` (Microsoft Edge baseline).
  5. `--vscode` — delegates to `lib/vscode.js` (extensions + settings/keybindings;
     `--minimal` swaps the 32-extension set for a 4-extension one).
  6. `--doctor` — delegates to `lib/doctor.js` (read-only diagnosis; exits 1 on
     blockers). Pairs with a profile flag (`--doctor --bootcamp`).
  7. `--identity` — sets just `user.name`/`user.email` via `git config --global`.
  8. _(default)_ — profile selection → tool installation loop.
- The installation loop builds each tool's runnable methods via
  `chooseCandidates(tool.install[platform], managers)` and tries them in order.
  The first method that exits cleanly wins; any non-zero exit throws and falls
  through to the next method. (It trusts the installer's exit code rather than
  re-probing afterwards — most managers only add the new binary to PATH for
  _future_ shells, so a same-process check would false-fail a real install.) If
  every method is exhausted it logs the methods tried and the last command to
  run manually. `--dry-run` prints the full ordered plan (primary + each
  fallback) without executing anything.
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

**Install spec keys** (`buildInstallCmd` picks the highest-priority key present
in a single candidate object; `normalizeSpec` expands a multi-key object into
ordered single-key candidates using this same order):

| Key       | Expands to                                                                       |
| --------- | -------------------------------------------------------------------------------- |
| `brew`    | `brew install <value>`                                                           |
| `cask`    | `brew install --cask <value>`                                                    |
| `apt`     | `sudo apt-get install -y <value>`                                                |
| `dnf`     | `sudo dnf install -y <value>`                                                    |
| `yum`     | `sudo yum install -y <value>`                                                    |
| `pacman`  | `sudo pacman -S --noconfirm <value>`                                             |
| `zypper`  | `sudo zypper install -y <value>`                                                 |
| `snap`    | `sudo snap install <value>` (value may carry flags, e.g. `code --classic`)       |
| `flatpak` | `flatpak remote-add --if-not-exists flathub … && flatpak install -y flathub <v>` |
| `winget`  | `winget install --silent --id <value>`                                           |
| `scoop`   | `scoop install <value>`                                                          |
| `choco`   | `choco install -y <value>`                                                       |
| `npm`     | `npm install -g <value>`                                                         |
| `script`  | Raw shell command (used when the official installer is a curl pipe)              |

**Single value vs. ordered fallbacks.** A platform's value is EITHER a single
spec object (legacy shape, still valid and byte-identical) OR an ordered array
of spec objects tried first-to-last until one is runnable and verifiably
succeeds:

```js
// Single — picked exactly as before
linux: { apt: 'jq' },

// Ordered fallbacks — name divergence handled explicitly per manager
linux: [
  { apt: 'redis-tools' }, // Debian/Ubuntu split out the client
  { dnf: 'redis' },
  { pacman: 'redis' },
  { zypper: 'redis' },
],

// Windows: winget → scoop (no admin) → choco (note choco's different id)
windows: [{ winget: 'Kubernetes.kubectl' }, { scoop: 'kubectl' }, { choco: 'kubernetes-cli' }],
```

**Never auto-translate package names across managers.** Cross-distro/manager
names frequently differ (`redis-tools` vs `redis`, `openjdk-17-jdk` vs
`java-17-openjdk-devel` vs `jdk17-openjdk`). Give each manager its own explicit
value, or omit it entirely and let a `script`/manual path handle it — omitting
is correct when you are unsure, since the loop simply skips an unavailable or
unlisted manager rather than running a wrong command.

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

Detection, normalisation, and package-manager bootstrap:

- **`detectPlatform()`** — maps `process.platform` (`darwin` → `macos`,
  `linux` → `linux`, `win32` → `windows`, anything else → `linux`).

- **`detectManagers(platform, { force })`** — returns a memoised `Set` of the
  package-manager keys actually present, probed via `hasCommand`. macOS: `brew`
  (and `cask`, the same binary) + `npm`. Linux: `apt`/`dnf`/`yum`/`pacman`/
  `zypper`/`snap`/`flatpak` + `npm`. Windows: `winget`/`scoop`/`choco` + `npm`.
  `script` is universally runnable and is never probed. Pass `{ force: true }`
  (or call `resetManagerCache()`) to re-probe after a bootstrap.

- **`normalizeSpec(value)`** — flattens a platform install value (single object,
  multi-key object, or array of objects) into an ordered list of single-key
  candidate objects, preserving array order and, within an object, the
  `buildInstallCmd` priority order. `null`/`undefined` → `[]`.

- **`isRunnable(candidate, managers)`** / **`chooseCandidates(spec, managers)`** —
  a candidate is runnable if it is a `script` or its manager is in the detected
  `Set`. `chooseCandidates` is `normalizeSpec` then filter, giving the ordered
  list of methods to actually attempt.

- **`managerKeyOf(candidate)`** — the single manager key of a normalised
  candidate (for logging).

- **`ensurePackageManager(platform, { dryRun, autoYes, confirm })`** — best-effort,
  conservative bootstrap. macOS: installs Homebrew if missing. Windows: if no
  `winget`/`scoop`/`choco` is found, offers (confirm-gated, auto under `--yes`,
  printed-only under `--dry-run`) to install Scoop, which needs no admin. Linux:
  never auto-installs a system package manager (apt/dnf/pacman _are_ the OS) —
  only warns if none is present. After a real bootstrap it prepends the new
  manager's bin/shims directory to `process.env.PATH` (the installers only edit
  shell profiles / the registry) so it is genuinely invocable for the rest of
  the run; under `--dry-run` it instead records the manager as assumed-present
  (per platform) so the printed plan reflects it.

- **`buildInstallCmd(spec)`** — given a single candidate object, returns the
  shell command (or `null`). Priority: `brew` → `cask` → `apt` → `dnf` → `yum`
  → `pacman` → `zypper` → `snap` → `flatpak` → `winget` → `scoop` → `choco` →
  `npm` → `script`. A legacy single-key object therefore produces a
  byte-identical command to before this layer existed.

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

### `lib/edge.js`

Handles `--edge`. Single export `setupEdge(platform, { dryRun, autoYes, confirm })`,
which installs Microsoft Edge (reusing `platform.js`'s ordered-fallback installer
machinery) and applies a curated, non-personal baseline read from `templates/edge/`:

- **`extensions.json`** — recommended Edge Add-ons IDs, applied as an
  `ExtensionSettings` policy with `installation_mode: normal_installed` (auto-installed
  but user-removable).
- **`settings.json`** — generic Edge policy settings (security/privacy/UX).
- **`bookmarks.json`** — curated public bookmarks in a simplified
  `{ bookmark_bar, other, synced }` tree; `materializeBookmarks()` expands it into a
  valid Edge `Bookmarks` file (assigning `guid`/`id`/`date_added`).

Policies are delivered via Edge's supported managed-policy mechanism per OS:
Windows generates a `.reg` file imported into `HKCU\Software\Policies\Microsoft\Edge`
(no admin); macOS uses `defaults write com.microsoft.Edge`; Linux writes
`/etc/opt/edge/policies/managed/devsetup-edge.json` (sudo). Bookmarks are written into
the `Default` profile, backing up any existing `Bookmarks` file. Everything honours
`--dry-run`. Windows is the primary tested path; macOS/Linux policy delivery is
best-effort. All template content is sanitised (no accounts, passwords, payment data,
or internal/personal URLs).

### `lib/vscode.js`

Handles `--vscode`. Single export `setupVscode(platform, { dryRun, autoYes, confirm })`:

- **Extensions** — reads the vendored `templates/dotfiles/vscode/extensions.json`
  (`{ recommendations: [...] }`, VS Code's standard format) and installs each via
  `code --install-extension <id> --force`, detecting `code` (or `code-insiders`) on
  PATH; missing CLI skips extensions with a hint.
- **Settings & keybindings** — reuses `dotfiles.js` (`getDotfileTargets` filtered to
  the `vscode-*` targets + `installDotfile`) to write `settings.json`/`keybindings.json`,
  backing up existing files.

`loadRecommendations(set)` is also exported (`set` = `'full'` | `'minimal'`), used by
`--vscode --minimal` and by the doctor's extension check. Everything honours `--dry-run`.

### `lib/doctor.js`

Handles `--doctor`. Read-only: each check runs a version/status probe through
`runner.capture()` (returns `null` on a missing command or non-zero exit and never
throws) and yields `{ status: 'pass' | 'fail' | 'warn', detail, fix? }`. `CHECK_LIBRARY`
holds the individual checks; `CHECKLISTS` maps an audience (`default`, `bootcamp`,
`web`, …) to a list of check ids. `runDoctor({ checklist, extensions })` prints the
report and returns `{ results, blockers }`; `bin/cli.js` exits `1` when `blockers > 0`,
so `--doctor` doubles as a CI gate or workshop pre-flight. The GitHub-reachability probe
is bounded to 10s so a captive network can't hang the diagnosis.

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
    linux:   { apt: 'my-tool' },           // single method, or an array (below)
    windows: { winget: 'Publisher.MyTool' },
  },
  // postInstall is optional:
  postInstall: 'Run: my-tool init to complete setup.',
}
```

**Adding fallbacks.** Make a platform's value an ordered array to try multiple
methods. List the most-preferred method first; on a given machine, methods whose
package manager is absent are skipped, and a method that runs but fails to put
the binary on PATH falls through to the next:

```js
linux:   [{ apt: 'my-tool' }, { dnf: 'my-tool' }, { script: 'curl … | sh' }],
windows: [{ winget: 'Publisher.MyTool' }, { scoop: 'my-tool' }, { choco: 'my-tool' }],
```

Only reuse a package name across managers when you know it matches. When a
distro's name differs (or you are unsure), give that manager its own explicit
value or omit it — an omitted manager is skipped, which is safer than installing
the wrong package.

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

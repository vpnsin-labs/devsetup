# devsetup

> Bootstrap your JavaScript development environment in one command.

A CLI that detects your OS and installs the tools you choose — web, mobile, backend, DevOps, or the full stack. Runs on macOS, Linux, and Windows.

## Quick start

```bash
npx @vpnsin-labs/devsetup
```

Or skip the profile prompt by passing a flag:

```bash
npx @vpnsin-labs/devsetup --js          # Minimal JavaScript dev
npx @vpnsin-labs/devsetup --web         # Web + Docker + Supabase + MongoDB
npx @vpnsin-labs/devsetup --mobile      # Android + iOS (Xcode CLI)
npx @vpnsin-labs/devsetup --backend     # Docker + DBs + Kubernetes + AWS
npx @vpnsin-labs/devsetup --devops      # Kubernetes-focused
npx @vpnsin-labs/devsetup --full-stack  # Everything

# Dotfiles (gitconfig, npmrc, zshrc, VS Code settings, Gradle config)
npx @vpnsin-labs/devsetup --dotfiles

# Documentation (7 markdown guides written to ./docs/)
npx @vpnsin-labs/devsetup --docs
npx @vpnsin-labs/devsetup --docs ./team-docs
```

## Bootstrap scripts

Run these on a fresh machine — they install fnm + Node.js first, then run devsetup.

**macOS / Linux:**

```bash
curl -fsSL https://raw.githubusercontent.com/vpnsin-labs/devsetup/main/setup.sh | bash
```

**Windows (PowerShell):**

```powershell
irm https://raw.githubusercontent.com/vpnsin-labs/devsetup/main/setup.ps1 | iex
```

## Profiles

| Profile        | Automatically installed | Optional (prompted)                                                                                                                                |
| -------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **js**         | git, fnm, Node.js LTS   | pnpm, GitHub CLI, VS Code, Bun, GitHub Desktop, Windows Terminal                                                                                   |
| **web**        | git, fnm, Node.js LTS   | pnpm, GitHub CLI, VS Code, Bun, WSL 2 (Windows), Docker, Supabase CLI, MongoDB, Postman, GitHub Desktop                                            |
| **mobile**     | git, fnm, Java 17       | VS Code, Xcode CLI, Android Studio, Watchman, CocoaPods, Flutter                                                                                   |
| **backend**    | git, fnm, jq            | pnpm, GitHub CLI, VS Code, WSL 2 (Windows), Docker, MongoDB, Supabase CLI, Postgres, Redis, AWS CLI, direnv, kubectl, minikube, Helm, k9s, Postman |
| **devops**     | git                     | WSL 2 (Windows), Docker, jq, AWS CLI, kubectl, minikube, Helm, k9s                                                                                 |
| **full-stack** | git, fnm, jq, Java 17   | everything above                                                                                                                                   |

## Dotfiles

`--dotfiles` installs opinionated starter configs to your home directory. You are prompted for your name, email, and optional Zscaler/proxy details. Existing files are automatically backed up as `.bak`.

| File                  | Destination                                                                |
| --------------------- | -------------------------------------------------------------------------- |
| `.gitconfig`          | `~/.gitconfig` — identity, aliases, credential helper, optional proxy      |
| `.gitignore` (global) | `~/.gitignore` — Node, macOS, Windows, IDE patterns                        |
| `.npmrc`              | `~/.npmrc` — registry, audit level, optional Zscaler cert/proxy            |
| `.zprofile`           | `~/.zprofile` — Homebrew, fnm, PATH (macOS/Linux)                          |
| `.zshrc`              | `~/.zshrc` — aliases, direnv/fnm hooks, proxy toggle helpers (macOS/Linux) |
| `gradle.properties`   | `~/.gradle/gradle.properties` — JVM memory, daemon, caching, proxy         |
| `init.gradle`         | `~/.gradle/init.gradle` — enterprise mirror repos, build settings          |
| `settings.json`       | VS Code user settings — format on save, theme, ESLint, proxy               |
| `keybindings.json`    | VS Code keybindings — terminal, navigation, multi-cursor shortcuts         |

## Documentation

`--docs` generates 8 markdown guides into `./docs/` (or a custom directory).
The guides are also committed to this repo so they render on GitHub and npm:

| Guide                                                                                                     | Contents                                                                              |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [macbook-setup.md](https://github.com/vpnsin-labs/devsetup/blob/main/docs/macbook-setup.md)               | Step-by-step macOS setup from scratch                                                 |
| [windows-setup.md](https://github.com/vpnsin-labs/devsetup/blob/main/docs/windows-setup.md)               | Step-by-step Windows setup from scratch                                               |
| [docker-local-dev.md](https://github.com/vpnsin-labs/devsetup/blob/main/docs/docker-local-dev.md)         | Run app stacks in Docker locally (Docker Desktop, WSL 2, file sharing, registry auth) |
| [proxy-setup.md](https://github.com/vpnsin-labs/devsetup/blob/main/docs/proxy-setup.md)                   | Zscaler + corporate proxy config for git, npm, Gradle, Docker, VS Code                |
| [repository-cloning.md](https://github.com/vpnsin-labs/devsetup/blob/main/docs/repository-cloning.md)     | SSH keys, PAT tokens, GitHub CLI auth, Azure DevOps                                   |
| [environment-settings.md](https://github.com/vpnsin-labs/devsetup/blob/main/docs/environment-settings.md) | `.env` files, direnv, global env vars, secret management                              |
| [azure-vpn-setup.md](https://github.com/vpnsin-labs/devsetup/blob/main/docs/azure-vpn-setup.md)           | Azure VPN Client, Windows App (AVD), RDP, Azure Bastion                               |
| [utility-scripts.md](https://github.com/vpnsin-labs/devsetup/blob/main/docs/utility-scripts.md)           | Full command reference for all installed tools                                        |

## Options

| Flag            | Description                                                                        |
| --------------- | ---------------------------------------------------------------------------------- |
| `--yes`, `-y`   | Auto-confirm all optional tool prompts                                             |
| `--no-optional` | Skip all optional tools (required tools only)                                      |
| `--dry-run`     | Print the full ordered install plan (primary + fallbacks) without running anything |
| `--help`        | Show help                                                                          |

## Tools

### JavaScript ecosystem

- **fnm** — fast Node.js version manager; auto-installs Node.js LTS after setup
- **pnpm** — disk-efficient package manager
- **Bun** — fast JavaScript runtime & package manager

### Editors & productivity

- **VS Code** — code editor
- **GitHub CLI (`gh`)** — manage PRs, issues, and repos from the terminal
- **GitHub Desktop** — GUI git client (macOS/Windows)
- **Postman** — API development and testing
- **Windows Terminal** — modern terminal for Windows

### Containers & Kubernetes

- **WSL 2** — Windows Subsystem for Linux 2; Docker Desktop's engine backend (Windows only)
- **Docker** — container platform (Docker Desktop on macOS/Windows)
- **kubectl** — Kubernetes CLI
- **minikube** — local Kubernetes cluster
- **Helm** — Kubernetes package manager
- **k9s** — terminal Kubernetes dashboard

### Databases

- **MongoDB Community** — local document database (v8.0)
- **MongoDB Shell (`mongosh`)** — interactive MongoDB shell
- **MongoDB Compass** — MongoDB GUI client (macOS/Windows)
- **Supabase CLI** — spin up a local Supabase stack
- **PostgreSQL client (`psql`)** — CLI access to Postgres databases
- **Redis** — in-memory data store and cache

### Mobile

- **Xcode Command Line Tools** — compilers for macOS/iOS builds (macOS only)
- **Java 17 (Temurin JDK)** — required for Android development
- **Android Studio** — Android IDE + SDK + emulator
- **Watchman** — file watcher for React Native hot-reload
- **CocoaPods** — iOS dependency manager (macOS only)
- **Flutter SDK** — Google's cross-platform UI toolkit

### Backend & infra

- **jq** — command-line JSON processor
- **AWS CLI** — Amazon Web Services CLI
- **direnv** — per-directory `.envrc` environment variables

## How it works

1. Detects your OS and which package managers are actually installed
   (macOS → Homebrew; Linux → apt/dnf/yum/pacman/zypper + snap/flatpak;
   Windows → winget/scoop/choco)
2. Prompts for a setup profile if you haven't passed one
3. Checks which tools are already installed and skips them
4. Installs required tools automatically; prompts before optional ones
5. After fnm installs, bootstraps Node.js LTS automatically
6. Offers to run `npx @vpnsin-labs/devkit init` if a `package.json` is present in the current directory

## Install fallbacks

Each tool can be installed by more than one method. devsetup detects which
package managers are present, then tries the available methods **in order**
until one succeeds — so a missing or broken package manager no longer blocks a
tool. Examples:

- **Linux** is no longer apt-only. On Fedora it uses `dnf`, on Arch `pacman`,
  on openSUSE `zypper`; GUI apps (VS Code, Postman, Android Studio) fall back
  from `snap` to `flatpak`. Package names that differ across distros (e.g.
  Redis is `redis-tools` on apt but `redis` on dnf/pacman) are handled
  explicitly — devsetup never guesses a name across managers.
- **Windows** falls back from `winget` to `scoop` (no admin) to `choco`. If
  **no** package manager is found, devsetup offers to install Scoop for you.
- **macOS** installs Homebrew automatically if it is missing.

When a method exits with an error, devsetup automatically moves on to the next
one; if every method is exhausted, it prints the exact command so you can run it
manually. Use `--dry-run` to print the full ordered plan (primary + fallbacks)
for every tool without changing anything.

## Contributing

See [CONTRIBUTING](.github/CONTRIBUTING.md) for the development workflow and commit
conventions. See [ARCHITECTURE](.github/ARCHITECTURE.md) for an explanation of the
codebase — how modules fit together, how to add tools, profiles, dotfiles, and doc
templates, and how the CI/release pipeline works.

## Security

See [SECURITY](.github/SECURITY.md) for how to report vulnerabilities.

## License

MIT © vpnsin-labs

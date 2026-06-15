# macOS Developer Setup

Complete guide for setting up a MacBook for JavaScript/full-stack development from scratch.

## Prerequisites

- macOS 13 (Ventura) or later
- Admin account (not a managed account)
- Apple ID (for App Store if needed)
- Corporate Wi-Fi or tethered network access

---

## 1. System preferences

Open **System Settings** and configure:

- **General → Software Update** — install all pending OS updates first
- **Privacy & Security → Developer Tools** — add Terminal and VS Code
- **Keyboard → Key Repeat** — set to Fast, Delay Until Repeat to Short
- **Trackpad** — enable Tap to Click, increase tracking speed
- **Energy → Prevent automatic sleeping when display is off** — on (for long builds)

---

## 2. Xcode Command Line Tools

Required before Homebrew and many build tools will work.

```bash
xcode-select --install
```

Follow the system dialog. This installs `git`, `clang`, `make`, and related tools.
Verify:

```bash
xcode-select -p
# /Library/Developer/CommandLineTools
```

---

## 3. Bootstrap devsetup

Run the one-liner to install fnm + Node.js, then launch the interactive setup:

```bash
curl -fsSL https://raw.githubusercontent.com/vpnsin-labs/devsetup/main/setup.sh | bash
```

Or choose a specific profile directly:

```bash
npx @vpnsin-labs/devsetup --web     # web development
npx @vpnsin-labs/devsetup --full-stack --yes   # everything, no prompts
```

---

## 4. Install dotfiles

```bash
npx @vpnsin-labs/devsetup --dotfiles
```

You will be prompted for:

- Your full name and work email (used in `.gitconfig`)
- Corporate proxy URL (leave blank if not behind a proxy)
- Zscaler CA cert path (leave blank if not using Zscaler)

Existing dotfiles are automatically backed up with a `.bak` suffix.

---

## 5. SSH key setup

Generate a key (if you don't already have one):

```bash
ssh-keygen -t ed25519 -C "your-email@company.com"
eval "$(ssh-agent -s)"
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
```

Add to `~/.ssh/config`:

```text
Host github.com
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_ed25519

Host ssh.dev.azure.com
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_ed25519
```

Add the public key to GitHub:

```bash
gh auth login          # authenticate GitHub CLI
gh ssh-key add ~/.ssh/id_ed25519.pub --title "MacBook $(date +%Y)"
```

Or copy and paste manually: `cat ~/.ssh/id_ed25519.pub`

---

## 6. GitHub / Azure DevOps authentication

### GitHub CLI

```bash
gh auth login --web
# Choose: GitHub.com → HTTPS → Login with a web browser
```

Verify: `gh auth status`

### Azure DevOps (PAT token)

1. Go to `https://dev.azure.com/<org>/_usersSettings/tokens`
2. Create a token with **Code (Read & Write)** scope
3. Store it:

```bash
git credential-manager store
# protocol=https
# host=dev.azure.com
# username=your@email.com
# password=<PAT>
```

Or use the Git Credential Manager that ships with Git:

```bash
git config --global credential.https://dev.azure.com.provider generic
```

---

## 7. Node.js version management

fnm is installed by devsetup. Common workflows:

```bash
fnm list-remote          # see available versions
fnm install 22           # install Node 22
fnm install --lts        # install latest LTS
fnm use 22               # switch in current shell
fnm default 22           # set as global default
fnm list                 # installed versions
```

Add an `.nvmrc` or `.node-version` file in a project to auto-switch:

```bash
echo "22" > .node-version
```

---

## 8. Verify the setup

```bash
git --version
node --version
pnpm --version
docker --version         # if Docker was installed
gh --version
code --version
```

---

## 9. Optional extras

### Fonts with ligatures

Download JetBrains Mono or Fira Code:

```bash
brew install --cask font-jetbrains-mono
brew install --cask font-fira-code
```

Then set in VS Code settings (`editor.fontFamily`).

### Rosetta (Apple Silicon only)

Some older tools need Rosetta:

```bash
softwareupdate --install-rosetta --agree-to-license
```

---

## Troubleshooting

| Problem                   | Fix                                                                |
| ------------------------- | ------------------------------------------------------------------ |
| `brew: command not found` | Re-run setup.sh or add Homebrew to PATH via `.zprofile`            |
| `fnm: command not found`  | Add fnm hook to `.zprofile` — see [proxy-setup.md](proxy-setup.md) |
| TLS errors with npm/git   | See [proxy-setup.md](proxy-setup.md) — likely Zscaler interception |
| Docker can't pull images  | Docker Desktop → Settings → Proxies — add corporate proxy          |
| `xcode-select: error`     | Run `sudo xcode-select --reset` then re-install CLT                |

See also: [proxy-setup.md](proxy-setup.md), [repository-cloning.md](repository-cloning.md)

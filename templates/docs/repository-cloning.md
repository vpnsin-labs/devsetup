# Repository Cloning

How to authenticate and clone repositories from GitHub and Azure DevOps.

---

## GitHub

### Option A — GitHub CLI (recommended)

```bash
# Install (if not already):
winget install GitHub.cli          # Windows
brew install gh                    # macOS

# Authenticate:
gh auth login --web
# → Choose: GitHub.com → HTTPS → Login with a web browser

# Clone:
gh repo clone owner/repo-name
gh repo clone owner/repo-name -- --depth 1   # shallow clone
```

Verify auth: `gh auth status`

### Option B — SSH key

Generate a key (one time):

```bash
ssh-keygen -t ed25519 -C "you@company.com"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519        # macOS / Linux
ssh-add $HOME\.ssh\id_ed25519   # Windows (PowerShell)
```

Add the public key to GitHub:

```bash
gh ssh-key add ~/.ssh/id_ed25519.pub --title "Laptop $(date +%Y)"
# or paste output of: cat ~/.ssh/id_ed25519.pub
```

Clone via SSH:

```bash
git clone git@github.com:owner/repo.git
```

`~/.ssh/config` (macOS):

```text
Host github.com
  AddKeysToAgent yes
  UseKeychain yes          # macOS only — stores passphrase in Keychain
  IdentityFile ~/.ssh/id_ed25519
```

### Option C — HTTPS with Personal Access Token

1. GitHub → Settings → Developer Settings → Personal Access Tokens → Fine-grained tokens
2. Set expiry, select repos, give **Contents (read/write)** permission
3. Copy the token

```bash
git clone https://github.com/owner/repo.git
# Username: your-github-username
# Password: <paste PAT>
```

The Git Credential Manager (installed with Git) stores the token automatically after first use.

---

## Azure DevOps

### Option A — PAT token (most common)

1. Go to `https://dev.azure.com/<org>/_usersSettings/tokens`
2. Create a token:
   - Name: `laptop-git-2025`
   - Expiration: 90 or 180 days
   - Scopes: **Code → Read & Write**
3. Copy the token (shown only once)

Clone:

```bash
git clone https://<org>@dev.azure.com/<org>/<project>/_git/<repo>
# Username: your-azure-email
# Password: <PAT>
```

Git Credential Manager stores this. To update a saved credential:

```bash
git credential reject <<EOF
protocol=https
host=dev.azure.com
EOF
```

### Option B — SSH key (Azure DevOps)

1. `https://dev.azure.com/<org>/_usersSettings/keys` → Add SSH key
2. Paste contents of `~/.ssh/id_ed25519.pub`

`~/.ssh/config`:

```text
Host ssh.dev.azure.com
  IdentityFile ~/.ssh/id_ed25519
  User git
```

Clone:

```bash
git clone git@ssh.dev.azure.com:v3/<org>/<project>/<repo>
```

### Option C — Azure CLI

```bash
az login                          # browser-based SSO
az devops configure --defaults organization=https://dev.azure.com/<org>
az repos clone --repository <repo> --project <project>
```

---

## Common git operations after cloning

```bash
# Standard workflow
git checkout -b feature/my-work  # create branch
git add .
git commit -m "feat: add thing"
git push -u origin feature/my-work
gh pr create --web               # open PR in browser (GitHub)

# Update from main
git fetch origin
git rebase origin/main           # or: git merge origin/main

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all local changes
git checkout .

# Stash work in progress
git stash push -m "wip: partial feature"
git stash pop
```

---

## Git LFS

For repos with large binary files (designs, datasets, media):

```bash
brew install git-lfs             # macOS
winget install Git.LFS           # Windows

git lfs install                  # one-time setup
git lfs pull                     # after cloning to download LFS files
```

---

## Troubleshooting

| Problem | Fix |
| ------- | --- |
| `fatal: Authentication failed` | PAT expired — create a new one and clear the stored credential |
| `Permission denied (publickey)` | SSH key not added to agent or not uploaded to GitHub/Azure |
| `SSL certificate problem` | Zscaler interception — see [proxy-setup.md](proxy-setup.md) |
| Slow clone on large repos | Use `--depth 1` for a shallow clone, then `git fetch --unshallow` when needed |
| `remote: Repository not found` | Check org/project/repo name spelling; verify PAT has correct scope |
| Git asks for credentials every time | Git Credential Manager not installed or not configured as helper |

### Clear stored credentials

```bash
# macOS — remove from keychain
git credential-osxkeychain erase <<EOF
protocol=https
host=github.com
EOF

# Windows — remove from Credential Manager
cmdkey /delete:git:https://github.com
cmdkey /delete:git:https://dev.azure.com
```

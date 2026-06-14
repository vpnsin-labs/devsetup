# Windows Developer Setup

Complete guide for setting up a Windows machine for JavaScript/full-stack development.

## Prerequisites

- Windows 10 22H2 / Windows 11 or later
- Admin rights (local or via IT-granted elevation)
- winget available (pre-installed on Windows 11; for Windows 10 install from the Microsoft Store)

---

## 1. Initial Windows configuration

### Show file extensions and hidden files

Open **File Explorer → View → Show → File name extensions** and **Hidden items**.

Or run in PowerShell (admin):

```powershell
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" `
  -Name HideFileExt -Value 0
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" `
  -Name Hidden -Value 1
```

### Set PowerShell execution policy

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Enable Windows Subsystem for Linux (optional)

```powershell
wsl --install          # installs WSL2 + Ubuntu by default
wsl --update
```

---

## 2. Install Windows Terminal and PowerShell 7

```powershell
winget install --id Microsoft.WindowsTerminal --silent
winget install --id Microsoft.PowerShell --silent
```

Restart and set PowerShell 7 as the default profile in Windows Terminal.

---

## 3. Bootstrap devsetup

Run in an **admin PowerShell** terminal:

```powershell
irm https://raw.githubusercontent.com/vpnsin-labs/devsetup/main/setup.ps1 | iex
```

Or with a specific profile:

```powershell
npx @vpnsin/devsetup --web
npx @vpnsin/devsetup --full-stack --yes
```

This installs Git (with Git Bash), fnm, Node.js LTS, and your chosen tools.

---

## 4. Install dotfiles

```powershell
npx @vpnsin/devsetup --dotfiles
```

On Windows this installs:

| File | Destination |
| ---- | ----------- |
| `.gitconfig` | `%USERPROFILE%\.gitconfig` |
| `.gitignore` (global) | `%USERPROFILE%\.gitignore` |
| `.npmrc` | `%USERPROFILE%\.npmrc` |
| `gradle.properties` | `%USERPROFILE%\.gradle\gradle.properties` |
| `init.gradle` | `%USERPROFILE%\.gradle\init.gradle` |
| VS Code `settings.json` | `%APPDATA%\Code\User\settings.json` |
| VS Code `keybindings.json` | `%APPDATA%\Code\User\keybindings.json` |

---

## 5. Git configuration

Git is installed by devsetup with the credential manager. Verify:

```powershell
git --version
git config --global user.name
git config --global user.email
```

The `manager` credential helper stores credentials in Windows Credential Manager. You'll be prompted to sign in on first git push/pull.

---

## 6. SSH key setup

In **Git Bash** (not PowerShell for better compatibility):

```bash
ssh-keygen -t ed25519 -C "your-email@company.com"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub   # copy this to GitHub/Azure
```

In PowerShell, enable the OpenSSH agent:

```powershell
Get-Service ssh-agent | Set-Service -StartupType Automatic
Start-Service ssh-agent
ssh-add $HOME\.ssh\id_ed25519
```

---

## 7. GitHub / Azure DevOps authentication

### GitHub CLI

```powershell
winget install --id GitHub.cli
gh auth login --web
gh auth status
```

### Azure DevOps (PAT token)

1. Go to `https://dev.azure.com/<org>/_usersSettings/tokens`
2. Create a token with **Code (Read & Write)** scope
3. On next `git push/pull` the Git Credential Manager dialog will appear
4. Enter your Azure email and the PAT as the password

---

## 8. Node.js version management

```powershell
fnm list-remote          # see available versions
fnm install 22           # install specific version
fnm install --lts        # latest LTS
fnm use 22               # switch in this shell
fnm default 22           # set global default
```

Add to `%USERPROFILE%\Documents\PowerShell\Microsoft.PowerShell_profile.ps1`:

```powershell
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
```

---

## 9. Environment variables

Set persistent user variables in PowerShell:

```powershell
[System.Environment]::SetEnvironmentVariable("NODE_ENV", "development", "User")
[System.Environment]::SetEnvironmentVariable("MY_VAR", "value", "User")
```

Or via **Settings → System → About → Advanced System Settings → Environment Variables**.

---

## 10. Verify the setup

```powershell
git --version
node --version
pnpm --version
docker --version    # if installed
gh --version
code --version
```

---

## Troubleshooting

| Problem | Fix |
| ------- | --- |
| `winget: not found` | Install from Microsoft Store: "App Installer" |
| `fnm: not found` | Add fnm to PATH — restart terminal after install |
| TLS / certificate errors | See [proxy-setup.md](proxy-setup.md) for Zscaler config |
| `Access denied` on npm install | Run terminal as Administrator, or fix npm prefix permissions |
| Docker Desktop can't start | Enable Hyper-V or WSL2 in Windows Features |
| VS Code extensions fail to install | See [proxy-setup.md](proxy-setup.md) — add proxy to VS Code settings |

See also: [proxy-setup.md](proxy-setup.md), [azure-vpn-setup.md](azure-vpn-setup.md)

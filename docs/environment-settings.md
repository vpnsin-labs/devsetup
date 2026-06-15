# Environment Settings

Managing environment variables, `.env` files, and per-project configuration.

---

## `.env` files

The standard convention for local environment configuration.

```bash
# .env (never commit — add to .gitignore)
NODE_ENV=development
PORT=3000
DATABASE_URL=mongodb://localhost:27017/myapp
API_KEY=secret-key-here

# .env.example (commit this — documents what's needed)
NODE_ENV=
PORT=3000
DATABASE_URL=
API_KEY=
```

Load in Node.js (built-in since v20.6):

```bash
node --env-file=.env server.js
```

Or with a package:

```bash
pnpm add -D dotenv
```

```js
import 'dotenv/config'; // ES modules
// or
require('dotenv').config(); // CommonJS
```

---

## direnv — per-directory `.envrc`

`direnv` auto-loads and unloads environment variables when you `cd` into a directory. Installed by `devsetup --backend`.

### Setup

```bash
brew install direnv              # macOS
sudo apt install direnv          # Linux

# Add to ~/.zshrc (done automatically by devsetup --dotfiles):
eval "$(direnv hook zsh)"

# Windows: direnv is not natively supported;
# use dotenv or manually source a script.
```

### Usage

```bash
# Create .envrc in your project
cat > .envrc << 'EOF'
export NODE_ENV=development
export PORT=3000
export DATABASE_URL="mongodb://localhost:27017/myapp"
source .env 2>/dev/null || true    # also load .env if present
EOF

direnv allow .    # whitelist this directory (required on first use)
```

### `.envrc` patterns

```bash
# Load from .env file
dotenv

# Use a specific Node version
use fnm 22

# Set AWS profile
export AWS_PROFILE=dev

# Add local bin to PATH
PATH_add bin

# Auto-activate virtualenv (Python)
layout python3
```

---

## Global environment variables

### macOS

Persist across shells by adding to `~/.zprofile` (login) or `~/.zshrc` (interactive):

```bash
export MY_GLOBAL_VAR="value"
export JAVA_HOME="/opt/homebrew/opt/temurin@17/libexec"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:$PATH"
```

After editing, reload: `source ~/.zshrc`

### Windows (PowerShell)

Per-user, persistent:

```powershell
[System.Environment]::SetEnvironmentVariable("MY_VAR", "value", "User")
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-17", "User")
```

System-wide (requires admin):

```powershell
[System.Environment]::SetEnvironmentVariable("MY_VAR", "value", "Machine")
```

Check a variable:

```powershell
$env:MY_VAR
[System.Environment]::GetEnvironmentVariable("MY_VAR", "User")
```

---

## Common environment variables

| Variable              | Purpose                        | Example                                |
| --------------------- | ------------------------------ | -------------------------------------- |
| `NODE_ENV`            | App environment mode           | `development` / `production`           |
| `PORT`                | HTTP server port               | `3000`                                 |
| `DATABASE_URL`        | Database connection string     | `mongodb://localhost:27017/db`         |
| `REDIS_URL`           | Redis connection string        | `redis://localhost:6379`               |
| `API_BASE_URL`        | Backend API URL                | `http://localhost:4000`                |
| `JAVA_HOME`           | JDK installation path          | `/opt/homebrew/opt/temurin@17/libexec` |
| `ANDROID_HOME`        | Android SDK path               | `~/Library/Android/sdk`                |
| `NODE_EXTRA_CA_CERTS` | Extra CA certs for Node.js TLS | `/path/to/zscaler-ca.pem`              |
| `AWS_PROFILE`         | AWS CLI named profile          | `dev`                                  |
| `KUBECONFIG`          | Kubernetes config file         | `~/.kube/config`                       |
| `DOCKER_HOST`         | Docker daemon socket           | `unix:///var/run/docker.sock`          |

---

## Managing multiple environments

Use separate `.env` files per environment:

```text
.env              → local dev defaults (not committed)
.env.test         → test runner settings
.env.staging      → staging overrides (committed without secrets)
.env.example      → template with empty values (committed)
```

Load the right file in your scripts:

```json
{
  "scripts": {
    "dev": "node --env-file=.env server.js",
    "test": "node --env-file=.env.test --test"
  }
}
```

---

## Secret management

Never commit actual secrets. Recommended approaches:

| Tool                 | Use case                                   |
| -------------------- | ------------------------------------------ |
| 1Password CLI (`op`) | Personal / team secrets in 1Password vault |
| Azure Key Vault      | Secrets for Azure-hosted apps              |
| AWS Secrets Manager  | Secrets for AWS-hosted apps                |
| HashiCorp Vault      | Self-hosted secret management              |
| GitHub/Azure Secrets | CI/CD pipeline secrets                     |

Example with 1Password CLI:

```bash
op run --env-file=.env.1password -- node server.js
```

Example `.env.1password`:

```dotenv
DATABASE_URL=op://vault/my-app/DATABASE_URL
API_KEY=op://vault/my-app/API_KEY
```

---

## Troubleshooting

| Problem                                   | Fix                                                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| Variable set but not visible in new shell | Add to the correct file (`.zshrc` for interactive, `.zprofile` for login)               |
| `direnv: error`                           | Run `direnv allow .` in the project directory                                           |
| Node can't find env var                   | Check if `.env` file is being loaded and that `process.env.VAR` matches the key exactly |
| VS Code terminal doesn't inherit env      | Restart VS Code after changing `~/.zshrc` / system env vars                             |
| Windows env var not picked up             | Set at "User" scope; restart the terminal process                                       |

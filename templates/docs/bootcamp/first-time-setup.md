# First-time setup

Setting up a laptop for coding for the first time. Takes about 30–40 minutes,
and everything here is free.

> Do this **before** you need it — ideally on home wifi the night before a
> workshop or your first day. Downloads are large and shared wifi is slow.

## The fast path

```bash
npx @vpnsin-labs/devsetup --bootcamp
npx @vpnsin-labs/devsetup --doctor --bootcamp
```

The first command installs everything. The second checks it worked and tells
you exactly what to fix if it didn't.

If you don't have Node.js yet, start with the bootstrap script instead:

- **Windows (PowerShell):** `irm https://raw.githubusercontent.com/vpnsin-labs/devsetup/main/setup.ps1 | iex`
- **macOS / Linux:** `curl -fsSL https://raw.githubusercontent.com/vpnsin-labs/devsetup/main/setup.sh | bash`

## What gets installed

| Tool | What it's for |
| --- | --- |
| **Git** | Saves versions of your code and shares it with your team |
| **Node.js + npm** | Runs JavaScript outside the browser; npm installs libraries |
| **VS Code** | The editor you write code in |
| **Postman** | Tests APIs without building a frontend first |
| **GitHub CLI** | Talks to GitHub from your terminal |

## Accounts you need (these aren't installs)

Sign up for these in a browser — all have free tiers:

1. **GitHub** — <https://github.com/signup> — where your code lives. Pick a clean,
   professional username; recruiters will see it.
2. **Figma** — <https://figma.com/signup> — design tool, runs in the browser.
3. **Postman** — <https://postman.com> — free account to sync your API requests.

## Tell Git who you are

Every commit is signed with your name and email. Set them once:

```bash
npx @vpnsin-labs/devsetup --identity
```

Or manually:

```bash
git config --global user.name  "Your Name"
git config --global user.email "your-github-email@example.com"
```

Use the same email as your GitHub account, or your commits won't link to your profile.

## You're ready when…

Run `npx @vpnsin-labs/devsetup --doctor --bootcamp`. Every line should be a
green `✔`. Yellow `!` lines are optional extras. Any red `✘` is a blocker —
the command prints the exact fix underneath it.

## No admin rights?

On a locked-down or college lab machine, `winget` and `choco` will fail with
"access denied". Scoop installs into your home folder and doesn't need admin:

```powershell
irm get.scoop.sh | iex
npx @vpnsin-labs/devsetup --bootcamp
```

devsetup automatically falls back to Scoop when it's available.

## Next

- [Git basics](./git-basics.md) — the five commands you'll use every day
- [Troubleshooting](./troubleshooting.md) — fixes for the errors you'll hit first

# Troubleshooting

The errors you're most likely to hit in your first week, and the one-line fix
for each.

> **Start here:** `npx @vpnsin-labs/devsetup --doctor --bootcamp`
> It checks your whole setup and prints the fix under anything that's broken.

## Setup

**`npm: command not found` / `node: command not found`**
Node.js isn't installed, or your terminal was open before you installed it.
Close and reopen the terminal first — PATH changes only apply to new shells.
Still broken? `npx @vpnsin-labs/devsetup --bootcamp`

**`npm run dev` says "Missing script: dev"**
You're in the wrong folder, or dependencies were never installed.
`cd` into the project folder and run `npm install`.

**"Access is denied" on Windows during install**
You don't have admin rights. Use Scoop, which installs to your home folder:
`irm get.scoop.sh | iex` then re-run devsetup.

**Installs fail behind college/office wifi**
You're probably behind a proxy. Run `npx @vpnsin-labs/devsetup --dotfiles`
and enter the proxy URL when prompted.

**`code` is not recognised**
VS Code is installed but its CLI isn't on PATH. In VS Code press `Ctrl+Shift+P`
and run **"Shell Command: Install 'code' command in PATH"**.

## Git

**"Push rejected — updates were rejected"**
Someone pushed before you. `git pull --rebase` then `git push`.

**"Please tell me who you are"**
Your Git identity isn't set. `npx @vpnsin-labs/devsetup --identity`

**"Authentication failed" when pushing**
GitHub stopped accepting passwords in 2021. Use `gh auth login`, or create a
personal access token and use it as the password.
Never paste a token into a chat, an issue, or a commit.

**"fatal: not a git repository"**
You're not inside the project folder. `cd` into it.

## JavaScript / React

**"Objects are not valid as a React child"**
You rendered a whole object instead of one of its fields.
`{project}` → `{project.title}`

**"Each child in a list should have a unique key"**
A `.map()` is missing `key=`. Add a stable one: `{items.map(i => <li key={i.id}>…</li>)}`

**"You're importing a component that needs useState"** (Next.js)
Interactive components need `"use client";` as the very first line of the file.

**Tailwind classes do nothing**
Tailwind wasn't enabled at setup, or `globals.css` is missing its `@tailwind`
directives. Re-add them and restart the dev server.

**Page is blank and the console shows nothing**
Check the terminal running `npm run dev` — build errors appear there, not in
the browser.

## Deploying

**Vercel build fails but it works locally**
Almost always a typo'd import path. Local filesystems ignore case; Vercel's
doesn't. `./components/navbar` ≠ `./components/Navbar`.
Read the red line in the build log — it names the file.

**Deployed site shows an old version**
The push didn't land, or it went to a branch that isn't the production branch.
Check the commit hash in Vercel against `git log --oneline`.

## Still stuck?

1. Read the **first** error line, not the last — the rest is usually noise.
2. Search the exact error text in quotes.
3. Ask a teammate. Fresh eyes beat an hour of solo debugging.

# Running Apps in Docker Locally

Guide for running our app stacks (API + web + databases) in Docker on a local macOS or
Windows machine with Docker Desktop. Covers install, the WSL 2 backend on Windows, file
sharing, private-registry auth, and running a Compose stack.

## Prerequisites

- Docker Desktop — installed by the devsetup `--web`, `--backend`, or `--full-stack` profile.
- A repo that ships a `docker-compose.yml` (and usually a `.env` for compose values).
- For private packages: a GitHub Packages token (classic PAT with `read:packages`) — see
  [section 5](#5-private-package-registry-auth).

---

## 1. Install Docker Desktop

Via devsetup (recommended — the `--web` profile also enables WSL 2 on Windows):

```bash
npx @vpnsin-labs/devsetup --web
```

Or directly:

```bash
brew install --cask docker
```

```powershell
winget install --silent --id Docker.DockerDesktop
```

---

## 2. Windows — enable the WSL 2 backend (required)

Docker Desktop on Windows runs its engine inside WSL 2. Enable it once:

```powershell
wsl --install --no-distribution
```

`--no-distribution` skips installing Ubuntu — Docker Desktop ships its own `docker-desktop`
distro, so you do not need a separate Linux distro just to run containers.

Then:

1. **Reboot.** The "Virtual Machine Platform" Windows feature only activates after a restart.
2. Launch Docker Desktop and wait for **Engine running** (green, bottom-left).
3. Verify:

```powershell
wsl --status              # Default Version: 2
docker run --rm hello-world
```

If `wsl --status` reports that virtualization is not enabled, turn on **Intel VT-x / AMD-V
(SVM)** in BIOS/UEFI, then reboot. Keep WSL current with `wsl --update`.

---

## 3. macOS — notes

Run `brew install --cask docker`, then open **Docker.app** once to finish setup.

On Apple Silicon:

- Enable **VirtioFS** (Settings → General) for faster bind-mount file I/O.
- Images built only for `linux/amd64` run under emulation — install Rosetta if a tool needs it:

```bash
softwareupdate --install-rosetta --agree-to-license
```

- Force an architecture when an image has no arm64 build:

```bash
docker run --platform linux/amd64 <image>
```

---

## 4. Docker Desktop configuration

Open **Docker Desktop → Settings**:

- **Resources → File sharing** — the drive/folder holding your repos must be shared, or bind
  mounts (`- .:/app`) fail. macOS shares `/Users` by default; the Windows WSL 2 backend shares
  all drives automatically.
- **Resources → Advanced** — give the engine enough CPU/RAM. 8 GB+ is comfortable for a
  multi-service stack (Node API + web + MongoDB).
- **General → Use the WSL 2 based engine** (Windows) — keep enabled.

---

## 5. Private package registry auth

Some apps install private packages from GitHub Packages (the `@vpnsin-org` scope, e.g.
`@vpnsin-org/crypto`). The image build needs a token to fetch them.

1. Create a classic PAT with `read:packages` at `https://github.com/settings/tokens`.
2. Add it to your global npmrc (`~/.npmrc` on macOS, `%USERPROFILE%\.npmrc` on Windows):

   ```text
   //npm.pkg.github.com/:_authToken=ghp_xxxxxxxxxxxxxxxxxxxx
   ```

3. App Compose stacks reuse that file as a Docker **build secret**, so the token is never
   baked into an image layer. Point the compose `NPMRC_FILE` variable at it in `.env`:

   ```text
   # macOS / Linux
   NPMRC_FILE=/Users/<you>/.npmrc
   # Windows (forward slashes are fine, spaces in the path are OK)
   NPMRC_FILE=C:/Users/<you>/.npmrc
   ```

The Dockerfile mounts it only for the install step (never persisted in a layer):

```dockerfile
RUN --mount=type=secret,id=github_npmrc,target=/root/.npmrc npm ci
```

Build secrets need BuildKit, which Docker Desktop enables by default.

---

## 6. Run an app stack

From a repo that has a `docker-compose.yml`:

```bash
docker compose up --build         # build images + start (first run is slow)
docker compose up -d --build      # detached
docker compose logs -f <service>  # follow one service
docker compose ps                 # status
docker compose down               # stop & remove containers (keeps named volumes)
docker compose down -v            # also wipe volumes (databases, node_modules)
```

Services usually publish to `localhost` (e.g. web on `:3000`, API on `:5555`, MongoDB on
`:27017`). The browser talks to the **host-published port**, so a frontend's `*_BACKEND_URL`
must point at `http://localhost:<api-port>`, not the in-network service name.

---

## 7. Hot reload across the bind mount

In dev, source is bind-mounted into the container so edits reload live. File-change events do
not always cross the host↔container boundary:

- **Windows** (WSL 2 mounting a Windows-drive path): inotify does not fire, so use a polling
  watcher — `nodemon --legacy-watch` or `CHOKIDAR_USEPOLLING=1` for Node, `WATCHPACK_POLLING=1000`
  for Next.js/webpack. For best performance, clone the repos **inside** the WSL 2 filesystem
  (`\\wsl$`) rather than under `C:\`.
- **macOS**: VirtioFS makes native watchers reliable; polling is usually unnecessary.

Keep `node_modules` in a **named volume** (not the host's) so platform-native modules such as
`bcrypt`, compiled for Linux, are not shadowed by host builds.

---

## 8. Verify

```bash
docker --version
docker compose version
docker run --rm hello-world
```

---

## Troubleshooting

| Problem                                    | Fix                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| `docker: command not found` after install  | Restart the terminal; on Windows make sure Docker Desktop is running                  |
| Engine will not start (Windows)            | Reboot after `wsl --install`; enable virtualization in BIOS/UEFI                      |
| `wsl --status`: virtualization not enabled | Turn on Intel VT-x / AMD-V (SVM) in firmware, then reboot                             |
| Bind mount is empty / permission denied    | Share the drive/folder in Settings → Resources → File sharing                         |
| Build fails on `@vpnsin-org/*` (401/403)   | `NPMRC_FILE` path wrong or token missing `read:packages` — see section 5              |
| Edits do not trigger a reload              | Enable polling (`*_POLLING`), or move the repo into the WSL 2 filesystem              |
| Dependency change not picked up            | `docker compose down -v` then `up --build` (named module volumes seed once)           |
| `port is already allocated`                | Stop the process using it, or change the host port in `docker-compose.yml`            |
| Pulls fail behind a corporate proxy        | Docker Desktop → Settings → Resources → Proxies; see [proxy-setup.md](proxy-setup.md) |

See also: [windows-setup.md](windows-setup.md), [macbook-setup.md](macbook-setup.md), [proxy-setup.md](proxy-setup.md), [environment-settings.md](environment-settings.md)

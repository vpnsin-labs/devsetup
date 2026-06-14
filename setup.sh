#!/usr/bin/env sh
# bootstrap for macOS / Linux
# Ensures fnm + Node LTS are present, then hands off to @vpnsin/devsetup.
set -e

# ── Helpers ──────────────────────────────────────────────────────────────────
bold="\033[1m"
cyan="\033[36m"
dim="\033[2m"
reset="\033[0m"

info() { printf "  ${cyan}→${reset} %s\n" "$1"; }
ok()   { printf "  \033[32m✔${reset} %s\n" "$1"; }

# ── Check for Node ────────────────────────────────────────────────────────────
if command -v node >/dev/null 2>&1; then
  ok "Node.js $(node --version) already available"
else
  # Install fnm if missing
  if ! command -v fnm >/dev/null 2>&1; then
    info "Installing fnm (Node version manager)..."
    if [ "$(uname)" = "Darwin" ]; then
      if command -v brew >/dev/null 2>&1; then
        brew install fnm
      else
        curl -fsSL https://fnm.vercel.app/install | bash
        export PATH="$HOME/.fnm:$PATH"
      fi
    else
      curl -fsSL https://fnm.vercel.app/install | bash
      export PATH="$HOME/.fnm:$PATH"
    fi
  fi

  # Source fnm into this shell session
  eval "$(fnm env --use-on-cd 2>/dev/null || true)"

  info "Installing Node.js LTS..."
  fnm install lts-latest
  fnm default lts-latest
  eval "$(fnm env)"
  ok "Node.js $(node --version) installed"
fi

# ── Run devsetup ──────────────────────────────────────────────────────────────
printf "\n${bold}devsetup${reset} ${dim}— developer machine bootstrap${reset}\n\n"
exec npx @vpnsin/devsetup "$@"

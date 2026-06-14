# ~/.zprofile — login shell (runs once on login, before .zshrc)
# Managed by devsetup. Safe to customise; re-run `npx @vpnsin-lab/devsetup --dotfiles` to reset.

# ── Homebrew (Apple Silicon path; Intel Macs use /usr/local) ──────────────────
if [[ -f /opt/homebrew/bin/brew ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [[ -f /usr/local/bin/brew ]]; then
  eval "$(/usr/local/bin/brew shellenv)"
fi

# ── fnm — fast Node.js version manager ───────────────────────────────────────
if command -v fnm &>/dev/null; then
  eval "$(fnm env --use-on-cd --shell zsh)"
fi

# ── Locale ────────────────────────────────────────────────────────────────────
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# ── PATH additions (Homebrew tools that don't auto-link) ──────────────────────
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"         # psql (libpq)
export PATH="/opt/homebrew/opt/gnu-sed/libexec/gnubin:$PATH" 2>/dev/null || true

# ── Corporate / Zscaler proxy (login-shell scope) ─────────────────────────────
{{SHELL_PROXY_LINES}}

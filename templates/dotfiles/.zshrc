# ~/.zshrc — interactive shell (runs for every new terminal tab)
# Managed by devsetup. Safe to customise; re-run `npx @vpnsin-lab/devsetup --dotfiles` to reset.

# ── fnm hook (interactive shell) ──────────────────────────────────────────────
if command -v fnm &>/dev/null; then
  eval "$(fnm env --use-on-cd --shell zsh)"
fi

# ── direnv hook ───────────────────────────────────────────────────────────────
if command -v direnv &>/dev/null; then
  eval "$(direnv hook zsh)"
fi

# ── History ───────────────────────────────────────────────────────────────────
HISTSIZE=10000
SAVEHIST=10000
HISTFILE="$HOME/.zsh_history"
setopt SHARE_HISTORY
setopt HIST_IGNORE_DUPS
setopt HIST_IGNORE_SPACE

# ── Navigation aliases ────────────────────────────────────────────────────────
alias ll='ls -la'
alias la='ls -A'
alias ..='cd ..'
alias ...='cd ../..'

# ── Git aliases ───────────────────────────────────────────────────────────────
alias gs='git status -sb'
alias gl='git log --oneline --graph --decorate --all'
alias gco='git checkout'
alias gpr='gh pr create --web'

# ── Docker aliases ────────────────────────────────────────────────────────────
alias dc='docker compose'
alias dcu='docker compose up -d'
alias dcd='docker compose down'
alias dps='docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'

# ── Node / pnpm aliases ───────────────────────────────────────────────────────
alias pn='pnpm'
alias pni='pnpm install'
alias pnr='pnpm run'
alias pnd='pnpm run dev'
alias pnb='pnpm run build'

# ── Kubernetes aliases ────────────────────────────────────────────────────────
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgs='kubectl get services'
alias kctx='kubectl config use-context'

# ── Proxy helpers (Zscaler / corporate VPN) ───────────────────────────────────
# Usage: proxy_on | proxy_off | proxy_status
proxy_on() {
  export http_proxy="${1:-${HTTP_PROXY_CORP:-http://proxy.company.com:80}}"
  export https_proxy="$http_proxy"
  export HTTP_PROXY="$http_proxy"
  export HTTPS_PROXY="$http_proxy"
  export no_proxy="localhost,127.0.0.1,.internal,.local"
  export NO_PROXY="$no_proxy"
  echo "  → Proxy ON: $http_proxy"
}
proxy_off() {
  unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY no_proxy NO_PROXY
  echo "  → Proxy OFF"
}
proxy_status() {
  echo "  http_proxy=${http_proxy:-<not set>}"
  echo "  https_proxy=${https_proxy:-<not set>}"
}

# ── PATH (local scripts) ──────────────────────────────────────────────────────
export PATH="$HOME/.local/bin:$PATH"

# ── Local overrides (not tracked by devsetup) ─────────────────────────────────
[[ -f "$HOME/.zshrc.local" ]] && source "$HOME/.zshrc.local"

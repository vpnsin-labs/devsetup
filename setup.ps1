# bootstrap for Windows PowerShell
# Ensures fnm + Node LTS are present, then hands off to @vpnsin-labs/devsetup.
$ErrorActionPreference = 'Stop'

function Write-Info  { Write-Host "  -> $args" -ForegroundColor Cyan }
function Write-Ok    { Write-Host "  v  $args" -ForegroundColor Green }
function Write-Warn  { Write-Host "  !  $args" -ForegroundColor Yellow }

# ── Check for Node ────────────────────────────────────────────────────────────
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Ok "Node.js $(node --version) already available"
} else {
    # Install fnm if missing
    if (-not (Get-Command fnm -ErrorAction SilentlyContinue)) {
        Write-Info "Installing fnm (Node version manager)..."
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            winget install --silent --id Schniz.fnm
        } else {
            Write-Warn "winget not found. Install Node.js manually from https://nodejs.org then re-run."
            exit 1
        }
        # Reload PATH so fnm is available
        $env:PATH = [System.Environment]::GetEnvironmentVariable('PATH', 'Machine') + ';' +
                    [System.Environment]::GetEnvironmentVariable('PATH', 'User')
    }

    Write-Info "Installing Node.js LTS via fnm..."
    fnm install lts-latest
    fnm default lts-latest

    # Apply fnm env for this session
    $fnmEnv = fnm env --shell power-shell 2>$null
    if ($fnmEnv) { Invoke-Expression $fnmEnv }

    Write-Ok "Node.js $(node --version) installed"
}

# ── Run devsetup ──────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "devsetup - developer machine bootstrap" -ForegroundColor White
Write-Host ""
npx @vpnsin-labs/devsetup @args

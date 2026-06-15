# Proxy & Zscaler Setup

How to configure tools to work behind Zscaler or any corporate HTTP/HTTPS proxy.

## Overview

Zscaler acts as a transparent HTTPS proxy that re-signs TLS certificates with its own CA. Tools that do their own certificate validation (git, npm, Gradle, curl, Docker, VS Code) need to be pointed at the Zscaler CA bundle, otherwise they fail with errors like:

```text
SELF_SIGNED_CERT_IN_CHAIN
unable to get local issuer certificate
PKIX path building failed
```

---

## Step 0 — Obtain the Zscaler CA certificate

### macOS

```bash
# Export from macOS keychain (run after logging into Zscaler client)
security find-certificate -a -p /Library/Keychains/System.keychain | \
  grep -A 50 "Zscaler" > ~/zscaler-ca.pem
```

Or ask your IT team for the `.pem` / `.crt` file and save it to `~/.config/certs/zscaler-ca.pem`.

### Windows

```powershell
# Export from Windows Certificate Store
$cert = Get-ChildItem Cert:\LocalMachine\Root | Where-Object { $_.Subject -match "Zscaler" }
$cert | Export-Certificate -FilePath "$HOME\zscaler-ca.crt" -Type CERT
# Convert to PEM:
certutil -encode "$HOME\zscaler-ca.crt" "$HOME\zscaler-ca.pem"
```

---

## Step 1 — System proxy

### macOS

System Settings → Wi-Fi / Ethernet → Details → Proxies.

Or via terminal (replace values for your environment):

```bash
networksetup -setwebproxy "Wi-Fi" proxy.company.com 80
networksetup -setsecurewebproxy "Wi-Fi" proxy.company.com 80
networksetup -setproxybypassdomains "Wi-Fi" localhost 127.0.0.1 "*.internal" "*.local"
```

### Windows

Settings → Network & Internet → Proxy → Manual proxy setup:

- Address: `proxy.company.com`
- Port: `80`
- Exceptions: `localhost;127.0.0.1;*.internal;*.local`

Or PowerShell:

```powershell
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" `
  -Name ProxyEnable -Value 1
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" `
  -Name ProxyServer -Value "proxy.company.com:80"
```

---

## Step 2 — Shell environment variables

Add to `~/.zshrc` (macOS) or PowerShell profile (Windows):

```bash
export http_proxy="http://proxy.company.com:80"
export https_proxy="http://proxy.company.com:80"
export no_proxy="localhost,127.0.0.1,.internal,.local"
# uppercase variants for tools that check these:
export HTTP_PROXY="$http_proxy"
export HTTPS_PROXY="$https_proxy"
export NO_PROXY="$no_proxy"
```

The `.zshrc` installed by `devsetup --dotfiles` includes `proxy_on` / `proxy_off` helper functions.

---

## Step 3 — Git

```bash
git config --global http.proxy http://proxy.company.com:80
git config --global https.proxy http://proxy.company.com:80

# Point git at the Zscaler CA bundle:
git config --global http.sslCAInfo ~/.config/certs/zscaler-ca.pem
```

If you still get TLS errors (last resort):

```bash
git config --global http.sslVerify false   # NOT recommended
```

---

## Step 4 — npm / pnpm

```bash
npm config set proxy http://proxy.company.com:80
npm config set https-proxy http://proxy.company.com:80
npm config set cafile ~/.config/certs/zscaler-ca.pem
```

Or edit `~/.npmrc` directly (installed by `devsetup --dotfiles`):

```ini
proxy=http://proxy.company.com:80
https-proxy=http://proxy.company.com:80
cafile=/Users/you/.config/certs/zscaler-ca.pem
```

For pnpm the same `.npmrc` file is read.

---

## Step 5 — Node.js / `NODE_EXTRA_CA_CERTS`

Many Node.js tools (bundlers, CLIs) read this env var to trust extra CAs:

```bash
export NODE_EXTRA_CA_CERTS="$HOME/.config/certs/zscaler-ca.pem"
```

Add to `~/.zshrc` or your CI environment.

---

## Step 6 — Gradle

Edit `~/.gradle/gradle.properties` (installed by `devsetup --dotfiles`):

```properties
systemProp.http.proxyHost=proxy.company.com
systemProp.http.proxyPort=80
systemProp.https.proxyHost=proxy.company.com
systemProp.https.proxyPort=80
systemProp.http.nonProxyHosts=localhost|127.0.0.1|*.internal

# Trust Zscaler CA for JVM HTTP connections:
systemProp.javax.net.ssl.trustStore=/path/to/cacerts-with-zscaler.jks
```

Or import the cert into the JVM trust store:

```bash
sudo keytool -importcert -file ~/zscaler-ca.pem \
  -alias zscaler -keystore $JAVA_HOME/lib/security/cacerts \
  -storepass changeit -noprompt
```

---

## Step 7 — Docker

### Docker Desktop (macOS / Windows)

Docker Desktop → Settings → Resources → Proxies:

- HTTP Proxy: `http://proxy.company.com:80`
- HTTPS Proxy: `http://proxy.company.com:80`
- No Proxy: `localhost,127.0.0.1,.internal`

For the Zscaler CA, add to Docker daemon config (`~/.docker/daemon.json`):

```json
{
  "registry-mirrors": [],
  "dns": ["8.8.8.8"]
}
```

And configure the build environment with `--build-arg`:

```dockerfile
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NODE_EXTRA_CA_CERTS
```

---

## Step 8 — VS Code

Open Settings (`Cmd/Ctrl+Shift+P` → Preferences: Open User Settings (JSON)) or edit `settings.json`:

```json
{
  "http.proxy": "http://proxy.company.com:80",
  "http.proxyStrictSSL": false,
  "http.systemCertificates": true
}
```

For extensions to install behind proxy, restart VS Code after setting these.

---

## Step 9 — curl / wget

```bash
# Per-request:
curl -x http://proxy.company.com:80 --cacert ~/.config/certs/zscaler-ca.pem https://example.com

# Global (add to ~/.curlrc):
echo 'proxy = http://proxy.company.com:80' >> ~/.curlrc
echo 'cacert = /Users/you/.config/certs/zscaler-ca.pem' >> ~/.curlrc
```

---

## Zscaler client

| Platform | Download                                            |
| -------- | --------------------------------------------------- |
| macOS    | Install from Self Service portal or IT distribution |
| Windows  | Install from Self Service portal or IT distribution |

After install:

1. Sign in with your corporate SSO / Azure AD credentials
2. Zscaler runs in the background and intercepts HTTPS traffic
3. The Zscaler CA cert is added to the system keychain automatically

### Toggling Zscaler on/off

Zscaler has a "Disable" option in the menu bar / system tray icon. IT policy controls whether this is allowed.

---

## Troubleshooting

| Error                               | Cause                     | Fix                                                                   |
| ----------------------------------- | ------------------------- | --------------------------------------------------------------------- |
| `SELF_SIGNED_CERT_IN_CHAIN`         | Zscaler CA not trusted    | Configure `cafile` / `sslCAInfo` / `NODE_EXTRA_CA_CERTS`              |
| `ECONNREFUSED`                      | Proxy not reachable       | Check proxy URL and port; verify Zscaler client is running            |
| `407 Proxy Auth Required`           | Proxy needs credentials   | Use `http://user:pass@proxy:80` (avoid if possible — use Zscaler SSO) |
| `npm ERR! network`                  | npm ignoring proxy env    | Set via `npm config set proxy` — env vars alone aren't always read    |
| Gradle sync fails in Android Studio | JVM doesn't trust Zscaler | Import cert into JVM cacerts store                                    |

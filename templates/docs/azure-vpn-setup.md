# Azure VPN & Windows App Setup

How to connect to corporate Azure infrastructure via VPN and access remote Windows desktops through Azure Virtual Desktop (AVD) / Windows App.

---

## Part 1 — Azure VPN Client

Used to connect to your organisation's Azure VPN Gateway for secure access to internal resources (dev databases, internal APIs, on-prem services).

### Prerequisites

- Your organisation must have an **Azure VPN Gateway** configured (Point-to-Site)
- IT team must provide the VPN profile or enrollment URL
- Azure AD (Entra ID) account with VPN permissions

### Install the Azure VPN Client

**macOS:**

```bash
# From the Mac App Store (search "Azure VPN Client")
# Or direct link: https://apps.apple.com/app/azure-vpn-client/id1553936137
brew install --cask azure-vpn-client   # if available via Cask
```

**Windows:**

```powershell
winget install --id Microsoft.AzureVPNClient
# Or from the Microsoft Store: "Azure VPN Client"
```

### Import the VPN profile

1. Open **Azure VPN Client**
2. Click **+** → **Import**
3. Select the `.xml` profile file provided by IT
4. Or use the enrollment URL: go to the Azure VPN Client → **+** → **Add** and enter the URL

### Connect

1. Select your VPN profile
2. Click **Connect**
3. Sign in with your corporate Azure AD account (SSO / MFA)
4. Status changes to **Connected**

### Verify the connection

```bash
# You should be able to reach internal hosts:
ping internal-server.company.local
curl http://internal-api.company.local/health
```

### Split tunneling

Your IT team controls whether all traffic or only corporate traffic goes through the VPN. If split tunneling is enabled, public internet traffic bypasses the VPN (and Zscaler still handles it when active).

---

## Part 2 — Windows App (Azure Virtual Desktop)

Windows App is the Microsoft client for **Azure Virtual Desktop (AVD)**, allowing you to access a full Windows desktop or specific published apps hosted in Azure.

### Install Windows App

**macOS:**

```bash
# From the Mac App Store (search "Windows App")
# https://apps.apple.com/app/windows-app/id1295203466
```

**Windows (to connect to a remote desktop pool):**

```powershell
winget install --id Microsoft.WindowsApp
# Or from the Microsoft Store: "Windows App"
```

**iOS / Android:** Available in App Store / Play Store as "Windows App".

### Sign in

1. Open **Windows App**
2. Click **Add an account** or **Sign in**
3. Enter your corporate email (Azure AD / Entra ID)
4. Complete MFA as prompted

### Connect to a Remote Desktop

1. After sign-in, your assigned **Desktops** and **Apps** appear automatically
2. Click the desktop or app to launch
3. The remote Windows session opens in a window or full screen

### Recommended settings

- **Display** → Set resolution to match your monitor
- **Devices** → Enable clipboard, printers, and drives as needed
- **Input** → Enable keyboard shortcut redirection (or keep local — preference)

---

## Part 3 — Remote Desktop Protocol (RDP) to specific Azure VMs

If you need to connect directly to an Azure VM (not via AVD):

### Prerequisites

- VM must be running and accessible (either via public IP or through VPN)
- RDP port 3389 must be allowed in the VM's NSG (Network Security Group)
- Credentials from IT or from the Azure Portal

### Connect from macOS

```bash
brew install --cask microsoft-remote-desktop
# Or from Mac App Store: "Microsoft Remote Desktop"
```

1. Open **Microsoft Remote Desktop**
2. Click **+** → **Add PC**
3. PC name: `<vm-ip-or-hostname>`
4. User account: add your corporate credentials
5. Connect

### Connect from Windows

```powershell
mstsc /v:<vm-ip-or-hostname>
```

Or via the built-in Remote Desktop Connection app.

### Connect via Azure Bastion (no public IP needed)

If the VM has no public IP but Azure Bastion is configured:

1. Go to **Azure Portal** → Virtual Machine → **Connect** → **Bastion**
2. Enter credentials
3. Browser-based RDP session opens (no client needed)

---

## Part 4 — Azure CLI

Useful for managing Azure resources from the terminal.

```bash
brew install azure-cli          # macOS
winget install --id Microsoft.AzureCLI  # Windows

az login                        # browser-based SSO
az account show                 # verify logged-in subscription
az account list                 # list all accessible subscriptions
az account set --subscription "My Subscription"
```

Common commands:

```bash
# List VMs
az vm list -o table

# Start / stop a VM
az vm start  --resource-group rg-name --name vm-name
az vm stop   --resource-group rg-name --name vm-name

# List Azure DevOps repos (requires az devops extension)
az extension add --name azure-devops
az devops configure --defaults organization=https://dev.azure.com/<org>
az repos list --project <project> -o table
```

---

## Troubleshooting

| Problem | Fix |
| ------- | --- |
| Azure VPN client won't connect | Check MFA prompt; verify with IT that your account has VPN permissions |
| VPN connects but can't reach internal hosts | Ask IT about split-tunneling config and DNS settings |
| Windows App shows no desktops | Your Azure AD account may not be assigned to an AVD host pool — contact IT |
| RDP session disconnects frequently | Increase session timeout in AVD host pool settings (IT); check network stability |
| `az login` browser doesn't open | Use `az login --use-device-code` instead |
| DNS resolution fails on VPN | Add corporate DNS to your resolver: `networksetup -setdnsservers Wi-Fi 10.0.0.10 8.8.8.8` |
| MFA loop / can't complete auth | Clear browser cookies or try in incognito / a different browser |

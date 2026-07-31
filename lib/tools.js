// Tool catalogue. Each entry describes how to detect and install a tool.
//
// A platform's install value is EITHER a single spec object (e.g. { brew: 'git' })
// OR an ordered array of spec objects expressing fallbacks, tried first-to-last
// until one is runnable and succeeds (e.g. [{ apt: 'redis-tools' }, { dnf: 'redis' }]).
// Recognised manager keys: brew, cask, apt, dnf, yum, pacman, zypper, snap,
// flatpak, winget, scoop, choco, npm, script.
//
// Cross-distro / cross-manager package names often differ — NEVER reuse one
// manager's name for another unless it is known to match. Give each manager its
// own explicit value, or omit it and rely on a script/manual fallback.

export const TOOLS = [
  // ── Core (included in every profile) ────────────────────────────────────
  {
    id: 'git',
    name: 'Git',
    description: 'version control',
    check: 'git',
    optional: false,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { brew: 'git' },
      linux: [{ apt: 'git' }, { dnf: 'git' }, { pacman: 'git' }, { zypper: 'git' }],
      windows: [{ winget: 'Git.Git' }, { scoop: 'git' }, { choco: 'git' }],
    },
  },
  {
    id: 'fnm',
    name: 'fnm',
    description: 'fast Node.js version manager',
    check: 'fnm',
    optional: false,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { brew: 'fnm' },
      linux: { script: 'curl -fsSL https://fnm.vercel.app/install | bash' },
      // fnm is required, so give it choco/scoop fallbacks for machines (LTSC,
      // Server, locked-down) where winget isn't provisioned.
      windows: [{ winget: 'Schniz.fnm' }, { scoop: 'fnm' }, { choco: 'fnm' }],
    },
    postInstall: 'Add fnm shell hook to your profile, then run: fnm install --lts',
  },

  // ── JavaScript Ecosystem ──────────────────────────────────────────────────
  {
    id: 'pnpm',
    name: 'pnpm',
    description: 'fast, disk-efficient package manager',
    check: 'pnpm',
    optional: true,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { brew: 'pnpm' },
      // npm needs Node, which fnm installs late; fall back to the standalone installer.
      linux: [{ npm: 'pnpm' }, { script: 'curl -fsSL https://get.pnpm.io/install.sh | sh -' }],
      windows: [{ winget: 'pnpm.pnpm' }, { scoop: 'pnpm' }, { choco: 'pnpm' }],
    },
  },
  {
    id: 'github-cli',
    name: 'GitHub CLI',
    description: 'manage GitHub from the terminal (gh)',
    check: 'gh',
    optional: true,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { brew: 'gh' },
      linux: {
        script:
          'curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null && sudo apt-get update && sudo apt-get install gh -y',
      },
      windows: [{ winget: 'GitHub.cli' }, { scoop: 'gh' }, { choco: 'gh' }],
    },
  },
  {
    id: 'bun',
    name: 'Bun',
    description: 'fast JavaScript runtime & package manager',
    check: 'bun',
    optional: true,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { brew: 'bun' },
      linux: { script: 'curl -fsSL https://bun.sh/install | bash' },
      windows: [{ winget: 'Oven-sh.Bun' }, { scoop: 'bun' }],
    },
  },

  // ── Developer Apps ────────────────────────────────────────────────────────
  {
    id: 'vscode',
    name: 'VS Code',
    description: 'code editor',
    check: 'code',
    optional: true,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { cask: 'visual-studio-code' },
      linux: [{ snap: 'code --classic' }, { flatpak: 'com.visualstudio.code' }],
      // scoop's `vscode` lives in the extras bucket (not auto-added), so omit it.
      windows: [{ winget: 'Microsoft.VisualStudioCode' }, { choco: 'vscode' }],
    },
  },
  {
    id: 'github-desktop',
    name: 'GitHub Desktop',
    description: 'GUI client for GitHub',
    check: null,
    optional: true,
    platforms: ['macos', 'windows'],
    install: {
      macos: { cask: 'github' },
      windows: { winget: 'GitHub.GitHubDesktop' },
    },
  },
  {
    id: 'postman',
    name: 'Postman',
    description: 'API development and testing',
    check: null,
    optional: true,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { cask: 'postman' },
      linux: [{ snap: 'postman' }, { flatpak: 'com.getpostman.Postman' }],
      windows: [{ winget: 'Postman.Postman' }, { choco: 'postman' }],
    },
  },
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'run AI models locally',
    check: 'ollama',
    optional: true,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      // The formula is the headless CLI/server; the cask is the menubar app (which
      // also puts `ollama` on PATH). Homebrew renamed the cask ollama -> ollama-app
      // when casks were barred from shadowing core formula names; the bare token now
      // only resolves via a rename shim, so use the canonical one.
      macos: [{ brew: 'ollama' }, { cask: 'ollama-app' }],
      linux: { script: 'curl -fsSL https://ollama.com/install.sh | sh' },
      windows: [{ winget: 'Ollama.Ollama' }, { scoop: 'ollama' }, { choco: 'ollama' }],
    },
    // The binary is small; the model is not. Students on shared campus wifi
    // should pull it at home the night before, not in the room on day one.
    postInstall:
      'Pull a model before you need it: `ollama pull llama3` (~4.7GB — do this on a fast connection).',
  },
  {
    id: 'windows-terminal',
    name: 'Windows Terminal',
    description: 'modern terminal for Windows',
    check: null,
    optional: true,
    platforms: ['windows'],
    install: {
      windows: { winget: 'Microsoft.WindowsTerminal' },
    },
  },

  // ── Containers & Orchestration ───────────────────────────────────────────
  {
    id: 'wsl2',
    name: 'WSL 2',
    description: 'Windows Subsystem for Linux 2 — backend required by Docker Desktop',
    // wsl.exe ships as an inbox stub even when the feature is off, so a command
    // probe cannot tell whether WSL 2 is actually enabled. Leave it unchecked and
    // rely on the idempotent installer (re-running is a no-op once enabled).
    check: null,
    optional: true,
    platforms: ['windows'],
    install: {
      windows: { script: 'wsl --install --no-distribution' },
    },
    postInstall: {
      windows:
        'Reboot to activate WSL 2 (Virtual Machine Platform), then launch Docker Desktop. If it still fails, enable virtualization (VT-x/AMD-V) in BIOS/UEFI. See docs/docker-local-dev.md.',
    },
  },
  {
    id: 'docker',
    name: 'Docker',
    description: 'container platform',
    check: 'docker',
    optional: true,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      // Renamed docker -> docker-desktop by the same Homebrew rule; the bare token
      // has no fallback candidate here, so it relies entirely on the rename shim.
      macos: { cask: 'docker-desktop' },
      linux: { script: 'curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker $USER' },
      windows: { winget: 'Docker.DockerDesktop' },
    },
    postInstall: {
      macos:
        'Open Docker.app to finish setup (Settings → General: enable VirtioFS; Settings → Resources → File sharing: add your projects folder). See docs/docker-local-dev.md.',
      windows:
        'Needs WSL 2 — reboot if prompted, then open Docker Desktop and wait for "Engine running". See docs/docker-local-dev.md.',
      linux: 'Log out and back in for docker group membership to take effect.',
    },
  },
  {
    id: 'kubectl',
    name: 'kubectl',
    description: 'Kubernetes command-line tool',
    check: 'kubectl',
    optional: true,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { brew: 'kubectl' },
      linux: {
        script:
          'curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl && rm kubectl',
      },
      windows: [
        { winget: 'Kubernetes.kubectl' },
        { scoop: 'kubectl' },
        { choco: 'kubernetes-cli' },
      ],
    },
  },
  {
    id: 'minikube',
    name: 'minikube',
    description: 'local Kubernetes cluster',
    check: 'minikube',
    optional: true,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { brew: 'minikube' },
      linux: {
        script:
          'curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 && sudo install minikube-linux-amd64 /usr/local/bin/minikube && rm minikube-linux-amd64',
      },
      windows: [{ winget: 'Kubernetes.minikube' }, { scoop: 'minikube' }, { choco: 'minikube' }],
    },
    postInstall: 'Start your cluster: minikube start',
  },
  {
    id: 'helm',
    name: 'Helm',
    description: 'Kubernetes package manager',
    check: 'helm',
    optional: true,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { brew: 'helm' },
      linux: {
        script: 'curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash',
      },
      windows: [{ winget: 'Helm.Helm' }, { scoop: 'helm' }, { choco: 'kubernetes-helm' }],
    },
  },
  {
    id: 'k9s',
    name: 'k9s',
    description: 'terminal Kubernetes dashboard',
    check: 'k9s',
    optional: true,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { brew: 'k9s' },
      linux: {
        script:
          'curl -L https://github.com/derailed/k9s/releases/latest/download/k9s_Linux_amd64.tar.gz | tar xz -C /tmp && sudo mv /tmp/k9s /usr/local/bin/',
      },
      windows: [{ winget: 'Derailed.k9s' }, { scoop: 'k9s' }, { choco: 'k9s' }],
    },
  },

  // ── Database ───────────────────────────────────────────────────────────────
  {
    id: 'mongodb',
    name: 'MongoDB Community',
    description: 'local MongoDB document database',
    check: 'mongod',
    optional: true,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { brew: 'mongodb/brew/mongodb-community@8.0' },
      linux: {
        script:
          'curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor && echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list && sudo apt-get update && sudo apt-get install -y mongodb-org',
      },
      windows: { winget: 'MongoDB.Server' },
    },
    postInstall: {
      macos: 'Start MongoDB: brew services start mongodb-community@8.0',
      linux: 'Start MongoDB: sudo systemctl start mongod && sudo systemctl enable mongod',
      windows: 'MongoDB runs as a Windows service automatically.',
    },
  },
  {
    id: 'mongosh',
    name: 'MongoDB Shell',
    description: 'interactive MongoDB shell (mongosh)',
    check: 'mongosh',
    optional: true,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { brew: 'mongosh' },
      linux: {
        script:
          'curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor 2>/dev/null; echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list && sudo apt-get update && sudo apt-get install -y mongodb-mongosh',
      },
      windows: { winget: 'MongoDB.Shell' },
    },
  },
  {
    id: 'mongodb-compass',
    name: 'MongoDB Compass',
    description: 'MongoDB GUI client',
    check: null,
    optional: true,
    platforms: ['macos', 'windows'],
    install: {
      macos: { cask: 'mongodb-compass' },
      windows: { winget: 'MongoDB.Compass.Community' },
    },
  },
  {
    id: 'supabase',
    name: 'Supabase CLI',
    description: 'local Supabase development environment',
    check: 'supabase',
    optional: true,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { brew: 'supabase/tap/supabase' },
      linux: {
        script:
          'curl -L https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar xz -C /tmp && sudo mv /tmp/supabase /usr/local/bin/',
      },
      windows: { winget: 'Supabase.CLI' },
    },
  },
  {
    id: 'psql',
    name: 'PostgreSQL client',
    description: 'psql CLI for database access',
    check: 'psql',
    optional: true,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { brew: 'libpq' },
      // apt splits out the client; dnf/pacman/zypper ship it in `postgresql`.
      linux: [
        { apt: 'postgresql-client' },
        { dnf: 'postgresql' },
        { pacman: 'postgresql' },
        { zypper: 'postgresql' },
      ],
      windows: { winget: 'PostgreSQL.PostgreSQL' },
    },
    postInstall: {
      macos: 'Add to PATH: echo \'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"\' >> ~/.zshrc',
    },
  },
  {
    id: 'redis',
    name: 'Redis',
    description: 'in-memory data store',
    check: 'redis-cli',
    optional: true,
    platforms: ['macos', 'linux'],
    install: {
      macos: { brew: 'redis' },
      // Package name differs per distro: Debian/Ubuntu split out `redis-tools`.
      linux: [{ apt: 'redis-tools' }, { dnf: 'redis' }, { pacman: 'redis' }, { zypper: 'redis' }],
    },
  },

  // ── Mobile ────────────────────────────────────────────────────────────────
  {
    id: 'xcode-cli',
    name: 'Xcode Command Line Tools',
    description: 'compilers and build tools for macOS/iOS development',
    check: 'clang',
    optional: true,
    platforms: ['macos'],
    install: {
      macos: { script: 'xcode-select --install' },
    },
    postInstall: 'Follow the Xcode CLT installation prompt if it appears.',
  },
  {
    id: 'java',
    name: 'Java 17 (Temurin JDK)',
    description: 'required for Android development',
    check: 'java',
    optional: false,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { brew: 'temurin@17' },
      // JDK 17 package name varies by distro.
      linux: [
        { apt: 'openjdk-17-jdk' },
        { dnf: 'java-17-openjdk-devel' },
        { pacman: 'jdk17-openjdk' },
        { zypper: 'java-17-openjdk-devel' },
      ],
      windows: { winget: 'EclipseAdoptium.Temurin.17.JDK' },
    },
  },
  {
    id: 'android-studio',
    name: 'Android Studio',
    description: 'Android IDE + SDK + emulator',
    check: null,
    optional: true,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { cask: 'android-studio' },
      linux: [{ snap: 'android-studio --classic' }, { flatpak: 'com.google.AndroidStudio' }],
      windows: { winget: 'Google.AndroidStudio' },
    },
    postInstall: 'Open Android Studio and complete the SDK setup wizard.',
  },
  {
    id: 'watchman',
    name: 'Watchman',
    description: 'file watcher used by React Native',
    check: 'watchman',
    optional: true,
    platforms: ['macos', 'linux'],
    install: {
      macos: { brew: 'watchman' },
      linux: { apt: 'watchman' },
    },
  },
  {
    id: 'cocoapods',
    name: 'CocoaPods',
    description: 'iOS/macOS dependency manager (Ruby gem)',
    check: 'pod',
    optional: true,
    platforms: ['macos'],
    install: {
      macos: { script: 'sudo gem install cocoapods' },
    },
  },
  {
    id: 'flutter',
    name: 'Flutter SDK',
    description: "Google's cross-platform UI toolkit",
    check: 'flutter',
    optional: true,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { cask: 'flutter' },
      linux: { snap: 'flutter --classic' },
      windows: { winget: 'Google.Flutter' },
    },
  },

  // ── Backend Tools ─────────────────────────────────────────────────────────
  {
    id: 'jq',
    name: 'jq',
    description: 'command-line JSON processor',
    check: 'jq',
    optional: false,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { brew: 'jq' },
      linux: [{ apt: 'jq' }, { dnf: 'jq' }, { pacman: 'jq' }, { zypper: 'jq' }],
      windows: [{ winget: 'jqlang.jq' }, { scoop: 'jq' }, { choco: 'jq' }],
    },
  },
  {
    id: 'awscli',
    name: 'AWS CLI',
    description: 'Amazon Web Services CLI',
    check: 'aws',
    optional: true,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { brew: 'awscli' },
      linux: {
        script:
          'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip && unzip /tmp/awscliv2.zip -d /tmp && sudo /tmp/aws/install && rm -rf /tmp/aws /tmp/awscliv2.zip',
      },
      windows: [{ winget: 'Amazon.AWSCLI' }, { scoop: 'aws' }, { choco: 'awscli' }],
    },
  },
  {
    id: 'direnv',
    name: 'direnv',
    description: 'per-directory environment variables (.envrc)',
    check: 'direnv',
    optional: true,
    platforms: ['macos', 'linux'],
    install: {
      macos: { brew: 'direnv' },
      linux: [{ apt: 'direnv' }, { dnf: 'direnv' }, { pacman: 'direnv' }, { zypper: 'direnv' }],
    },
    postInstall: 'Add direnv hook to your shell profile: https://direnv.net/docs/hook.html',
  },

  // ── Everyday / Productivity apps ──────────────────────────────────────────
  {
    id: 'notepadpp',
    name: 'Notepad++',
    description: 'lightweight text & code editor',
    check: null,
    optional: true,
    platforms: ['windows'],
    install: {
      windows: [{ winget: 'Notepad++.Notepad++' }, { choco: 'notepadplusplus' }],
    },
  },
  {
    id: '7zip',
    name: '7-Zip',
    description: 'file archiver (zip, 7z, rar, …)',
    check: null,
    optional: true,
    platforms: ['windows'],
    install: {
      windows: [{ winget: '7zip.7zip' }, { scoop: '7zip' }, { choco: '7zip' }],
    },
  },
  {
    id: 'chrome',
    name: 'Google Chrome',
    description: 'web browser',
    check: null,
    optional: true,
    platforms: ['macos', 'windows'],
    install: {
      macos: { cask: 'google-chrome' },
      windows: [{ winget: 'Google.Chrome' }, { choco: 'googlechrome' }],
    },
  },
  {
    id: 'vlc',
    name: 'VLC',
    description: 'media player for video and audio',
    check: null,
    optional: true,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { cask: 'vlc' },
      linux: [{ flatpak: 'org.videolan.VLC' }, { snap: 'vlc' }],
      windows: [{ winget: 'VideoLAN.VLC' }, { choco: 'vlc' }],
    },
  },
  {
    id: 'powertoys',
    name: 'PowerToys',
    description: 'Windows power-user utilities (window snapping, bulk rename, colour picker)',
    check: null,
    optional: true,
    platforms: ['windows'],
    install: {
      windows: [{ winget: 'Microsoft.PowerToys' }, { choco: 'powertoys' }],
    },
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    description: 'markdown notes & knowledge base',
    check: null,
    optional: true,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { cask: 'obsidian' },
      linux: [{ flatpak: 'md.obsidian.Obsidian' }, { snap: 'obsidian' }],
      windows: [{ winget: 'Obsidian.Obsidian' }, { choco: 'obsidian' }],
    },
  },
];

export const PROFILES = {
  essentials: {
    name: 'Essentials',
    description: 'Everyday apps for a new laptop — editors, browser, GitHub, utilities',
    ids: [
      'git',
      'vscode',
      'notepadpp',
      'github-desktop',
      'github-cli',
      'chrome',
      'vlc',
      '7zip',
      'powertoys',
      'obsidian',
    ],
  },
  bootcamp: {
    name: 'Bootcamp',
    description: 'First-time setup — Git, Node.js, VS Code, Postman',
    // Deliberately lean. No Docker/WSL2/databases: this profile targets a
    // personal laptop on shared wifi with ~30 minutes and possibly no admin
    // rights. Anything heavier belongs in --web or --full-stack.
    ids: ['git', 'fnm', 'vscode', 'github-cli', 'postman'],
  },
  js: {
    name: 'JavaScript',
    description: 'git, fnm, Node.js LTS, pnpm, VS Code, GitHub CLI',
    ids: [
      'git',
      'fnm',
      'pnpm',
      'github-cli',
      'vscode',
      'bun',
      'github-desktop',
      'windows-terminal',
    ],
  },
  web: {
    name: 'Web',
    description: 'JS tools + Docker, Supabase, MongoDB, Postman',
    ids: [
      'git',
      'fnm',
      'pnpm',
      'github-cli',
      'vscode',
      'bun',
      'wsl2',
      'docker',
      'supabase',
      'mongodb',
      'mongosh',
      'postman',
      'github-desktop',
      'windows-terminal',
    ],
  },
  mobile: {
    name: 'Mobile',
    description: 'Xcode CLI, Java, Android Studio, CocoaPods, Flutter',
    ids: [
      'git',
      'fnm',
      'vscode',
      'xcode-cli',
      'java',
      'android-studio',
      'watchman',
      'cocoapods',
      'flutter',
    ],
  },
  backend: {
    name: 'Backend',
    description: 'Docker, MongoDB, Supabase, Postgres, Redis, Kubernetes, AWS CLI',
    ids: [
      'git',
      'fnm',
      'pnpm',
      'github-cli',
      'vscode',
      'jq',
      'wsl2',
      'docker',
      'mongodb',
      'mongosh',
      'supabase',
      'psql',
      'redis',
      'awscli',
      'direnv',
      'kubectl',
      'minikube',
      'helm',
      'k9s',
      'postman',
    ],
  },
  devops: {
    name: 'DevOps',
    description: 'Docker, Kubernetes (kubectl, minikube, helm, k9s), AWS CLI, jq',
    ids: ['git', 'wsl2', 'docker', 'jq', 'awscli', 'kubectl', 'minikube', 'helm', 'k9s'],
  },
  'full-stack': {
    name: 'Full-stack',
    description: 'Everything — all profiles combined',
    ids: [
      'git',
      'fnm',
      'pnpm',
      'github-cli',
      'bun',
      'vscode',
      'github-desktop',
      'postman',
      'windows-terminal',
      'wsl2',
      'docker',
      'kubectl',
      'minikube',
      'helm',
      'k9s',
      'mongodb',
      'mongosh',
      'mongodb-compass',
      'supabase',
      'psql',
      'redis',
      'xcode-cli',
      'java',
      'android-studio',
      'watchman',
      'cocoapods',
      'flutter',
      'jq',
      'awscli',
      'direnv',
    ],
  },
};

// Tool catalogue. Each entry describes how to detect and install a tool.
// install specs per platform: { brew?, cask?, apt?, snap?, winget?, npm?, script? }

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
      linux: { apt: 'git' },
      windows: { winget: 'Git.Git' },
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
      windows: { winget: 'Schniz.fnm' },
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
      linux: { npm: 'pnpm' },
      windows: { winget: 'pnpm.pnpm' },
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
      windows: { winget: 'GitHub.cli' },
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
      windows: { winget: 'Oven-sh.Bun' },
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
      linux: { snap: 'code --classic' },
      windows: { winget: 'Microsoft.VisualStudioCode' },
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
      linux: { snap: 'postman' },
      windows: { winget: 'Postman.Postman' },
    },
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
    id: 'docker',
    name: 'Docker',
    description: 'container platform',
    check: 'docker',
    optional: true,
    platforms: ['macos', 'linux', 'windows'],
    install: {
      macos: { cask: 'docker' },
      linux: { script: 'curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker $USER' },
      windows: { winget: 'Docker.DockerDesktop' },
    },
    postInstall: {
      macos: 'Open Docker.app to complete setup.',
      windows: 'Open Docker Desktop to complete setup.',
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
      windows: { winget: 'Kubernetes.kubectl' },
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
      windows: { winget: 'Kubernetes.minikube' },
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
      windows: { winget: 'Helm.Helm' },
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
      windows: { winget: 'Derailed.k9s' },
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
      linux: { apt: 'postgresql-client' },
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
      linux: { apt: 'redis-tools' },
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
      linux: { apt: 'openjdk-17-jdk' },
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
      linux: { snap: 'android-studio --classic' },
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
      linux: { apt: 'jq' },
      windows: { winget: 'jqlang.jq' },
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
      windows: { winget: 'Amazon.AWSCLI' },
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
      linux: { apt: 'direnv' },
    },
    postInstall: 'Add direnv hook to your shell profile: https://direnv.net/docs/hook.html',
  },
];

export const PROFILES = {
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
    ids: ['git', 'docker', 'jq', 'awscli', 'kubectl', 'minikube', 'helm', 'k9s'],
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

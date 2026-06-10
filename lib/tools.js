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

  // ── Web ──────────────────────────────────────────────────────────────────
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

  // ── Mobile ────────────────────────────────────────────────────────────────
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
    check: null, // no single CLI command; always prompt
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

  // ── Backend ───────────────────────────────────────────────────────────────
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
    name: 'Redis client',
    description: 'redis-cli for cache/queue access',
    check: 'redis-cli',
    optional: true,
    platforms: ['macos', 'linux'],
    install: {
      macos: { brew: 'redis' },
      linux: { apt: 'redis-tools' },
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
  web: {
    name: 'Web',
    description: 'Node, pnpm, Docker, VS Code',
    ids: ['git', 'fnm', 'pnpm', 'docker', 'vscode'],
  },
  mobile: {
    name: 'Mobile',
    description: 'Java, Android Studio, CocoaPods, Flutter',
    ids: ['git', 'fnm', 'java', 'android-studio', 'watchman', 'cocoapods', 'flutter'],
  },
  backend: {
    name: 'Backend-heavy',
    description: 'Docker, Postgres, Redis, AWS CLI, jq, direnv',
    ids: ['git', 'fnm', 'docker', 'jq', 'psql', 'redis', 'awscli', 'direnv', 'vscode'],
  },
  'full-stack': {
    name: 'Full-stack',
    description: 'All of the above combined',
    ids: [
      'git',
      'fnm',
      'pnpm',
      'docker',
      'vscode',
      'java',
      'android-studio',
      'watchman',
      'cocoapods',
      'flutter',
      'jq',
      'psql',
      'redis',
      'awscli',
      'direnv',
    ],
  },
};

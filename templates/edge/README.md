# Edge baseline

A small, **curated and non-personal** Microsoft Edge configuration applied by
`devsetup --edge`. It is meant as a sensible public starting point — not a copy
of any individual's profile.

- `extensions.json` — reputable recommended extensions (Edge Add-ons IDs),
  auto-installed by policy.
- `settings.json` — generic Edge policy settings (security, privacy, UX); no
  personal data.
- `bookmarks.json` — curated public bookmarks: icon-only quick-launch
  favourites on the bar, a `🎨 Workspace` folder of themed groups, plus the
  wider public link collection.

## Bookmarks layout

- **Icon-only favourites** sit at the root of the favourites bar with blank
  names, so Edge shows just the favicon (Teams, Outlook, OneNote, Microsoft
  365, Notion, YouTube, Gmail, Drive, Calendar, Google Finance, Maps, McKinsey,
  Claude, ChatGPT, GitHub, WhatsApp, Translate, Perplexity, Reddit, FMHY).
- **`🎨 Workspace`** groups themed reading/working links. Each group is an
  emoji-labelled folder: 📘 Learn & Explore Tech (incl. free courses from
  Microsoft, Google, AWS and Anthropic), 📈 Indian Stock Market, 🚀 SME IPO,
  🌍 Geopolitics, and 🧰 Archives & Free Resources.

> **On "colour":** the Edge/Chromium `Bookmarks` file has no colour attribute,
> and true Edge **Workspaces** / coloured tab-groups are account-bound cloud
> state that a static, cross-platform template cannot provision. The emoji
> labels are the portable stand-in for that visual grouping.
>
> **Grey resources:** a few entries are paywall-bypass or shadow-library tools
> (12ft.io, archive.today, Library Genesis, FMHY). They are included as
> commonly-requested free-resource links; legality varies by jurisdiction and
> some mirrors are frequently offline.

## Principles

- **No personal data.** No accounts, passwords, payment autofill, history,
  homepage, default search, or private/internal URLs are ever shipped.
- **No risky extensions.** Free VPNs, video downloaders, and webcam-access
  extensions are intentionally excluded.
- **Reversible & transparent.** Extensions install as `normal_installed`
  (removable). Policy settings appear as "managed" and can be cleared by
  re-running with the reset option.

## How it is applied

`devsetup --edge` installs Microsoft Edge (if missing), then applies the
baseline using Edge's supported **managed-policy** mechanism per OS:

- **Windows** — registry under `HKCU\SOFTWARE\Policies\Microsoft\Edge` (no admin)
- **macOS** — `defaults write com.microsoft.Edge ...`
- **Linux** — JSON in `/etc/opt/edge/policies/managed/` (needs sudo)

Bookmarks (if present) are written into the Edge profile's `Bookmarks` file,
backing up any existing file first. Restart Edge for everything to take effect.

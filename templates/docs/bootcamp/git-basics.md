# Git basics

Enough Git to work on a team without fear. You'll use five commands 95% of the time.

## The mental model

Your code moves through four places:

```text
Working Directory  →  Staging Area  →  Local Repo  →  Remote (GitHub)
   (your edits)         git add        git commit      git push
```

Nothing leaves your machine until you `push`. Nothing is saved as a version
until you `commit`. That's the whole idea.

## The daily loop

```bash
git pull            # get everyone else's latest work first
# ...write code...
git add .           # stage what you changed
git commit -m "feat: add contact form"
git push            # share it
```

## Branches and pull requests

Never build directly on `main`. Branch, build, then open a pull request (PR)
so a teammate reviews it before it merges.

```bash
git checkout -b feature/contact-form   # create + switch to a branch
# ...write code, add, commit...
git push -u origin feature/contact-form
```

Then open the PR on GitHub — it'll show a "Compare & pull request" button right
after you push. Or use the CLI:

```bash
gh pr create --base main --fill
```

## Writing commit messages

A good message finishes the sentence *"If applied, this commit will…"*.

| Prefix | Use for |
| --- | --- |
| `feat:` | a new feature |
| `fix:` | a bug fix |
| `docs:` | documentation only |
| `refactor:` | restructuring without behaviour change |
| `chore:` | tooling, dependencies, config |

Good: `feat: add mobile menu toggle to navbar`
Bad: `changes`, `update`, `asdf`, `final final v2`

## Command reference

| Command | What it does |
| --- | --- |
| `git status` | What's changed? Run this constantly |
| `git pull` | Fetch and merge the latest from the remote |
| `git add .` | Stage all your changes |
| `git commit -m "..."` | Save a version locally |
| `git push` | Send your commits to GitHub |
| `git log --oneline` | See recent commits, compactly |
| `git checkout -b name` | Create and switch to a new branch |
| `git switch main` | Switch back to main |
| `git diff` | See exactly what you changed |

## When it breaks

| Problem | Fix |
| --- | --- |
| **"Push rejected"** — someone pushed first | `git pull --rebase` then `git push` |
| **Merge conflict** | Open the file, look for `<<<<<<<`, keep the right lines, delete the markers, then `git add` and `git commit` |
| **Committed to the wrong branch** | `git switch correct-branch` — commits stay staged if you haven't pushed |
| **Want to undo the last commit** (not pushed) | `git reset --soft HEAD~1` — keeps your changes |
| **Want to throw away local changes** | `git restore .` — destructive, be sure |
| **"fatal: not a git repository"** | You're in the wrong folder. `cd` into the project |

## Three golden rules

1. **Pull before you push.** Most conflicts are just stale local copies.
2. **Commit small and often.** A commit per logical change, not per day.
3. **Never force-push a shared branch.** `--force` overwrites your teammates' work.

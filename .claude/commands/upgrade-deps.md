# Comprehensive Dependency Upgrade

Perform a full dependency upgrade workflow for the Lifegames Design System: update all packages, fix breaking changes, create a PR, and clean up superseded Dependabot PRs.

This is a **pnpm workspace + Swift Package Manager** monorepo. Both ecosystems must be verified.

## Pre-flight Checks

1. List all open Dependabot PRs (grouped per `.github/dependabot.yml`):
```bash
unset GITHUB_TOKEN && gh pr list --author "app/dependabot" --state open --json number,title,headRefName
```

2. Check outdated workspace packages:
```bash
pnpm outdated --recursive
```

3. Review the active `ignore` and `groups` blocks in `.github/dependabot.yml` before bumping anything — several deps are intentionally pinned (e.g. `vite` major, `@astrojs/starlight` major, `ajv*` majors). Do not bypass these without a documented reason.

## Workflow Steps

### Phase 1: Worktree Setup

Create an isolated worktree for the upgrade work:

```bash
git worktree add -b chore/upgrade-dependencies ~/wt/design-system-Lifegames-upgrade HEAD
cd ~/wt/design-system-Lifegames-upgrade
pnpm install --frozen-lockfile
```

### Phase 2: Dependency Updates

This is a pnpm workspace monorepo — upgrading root deps alone does NOT upgrade workspace packages (`packages/tokens`, `packages/web`, `apps/docs`, `apps/storybook`). Always use `--recursive`:

```bash
pnpm update --latest --recursive
```

Then verify no workspace packages remain outdated:
```bash
pnpm outdated --recursive
```

**Respect the dependabot ignore rules.** These bumps must NOT be applied automatically:
- `vite` major — blocked until Storybook 10 + Astro 6.x ship Vite 8 support (see PR #23)
- `@astrojs/starlight` major — pre-1.0; minors are safe, majors require manual migration
- `ajv` / `ajv-formats` / `ajv-cli` majors — require coordinated migration of `validate.ts` and consumer schemas

If `pnpm update --latest --recursive` would cross any of those, pin the package in `package.json` first or pass an explicit version.

### Phase 3: Fix Breaking Changes

Run type checking and lint:

```bash
pnpm lint
```

**Repo-specific breaking change hot spots:**

| Package | Risk | Where it bites |
|---------|------|----------------|
| `vite` major | peerDep mismatch with Storybook / Astro | `packages/web`, `apps/storybook`, `apps/docs` |
| `@storybook/*` mismatched | framework adapter ≠ addon version | Story load failures; bump as the `storybook` group |
| `astro` / `@astrojs/*` mismatched | build break | Bump as the `astro-docs` group |
| `style-dictionary` minor/major | transform/format API churn | `style-dictionary.config.mjs`, regenerated outputs |
| `ajv` / `ajv-formats` pair | mismatched pair broke validation (May 2026 incident) | `schemas/validate.ts` |
| Storybook major | addon API rewrite | `apps/storybook/.storybook/`, `.stories.*` files |

### Phase 4: Verify

Run the full local verification across both ecosystems.

**Node / pnpm side:**
```bash
pnpm lint
pnpm build:tokens
pnpm dtcg:validate
pnpm tokens:parity
pnpm build
pnpm test
```

**Swift side (token parity + widget rendering depends on these):**
```bash
swift build
swift test
```

If any step fails, fix the issue and re-run that step before proceeding. Token regeneration (`pnpm build:tokens`) MUST be re-run after any token source change so CSS/JS/Swift outputs stay in lockstep.

### Phase 5: Commit and Push

```bash
git add -A
git commit -m 'chore(deps): upgrade dependencies to latest versions

- Update [list key packages and versions]
- Fix [any breaking-change adjustments]
- Supersedes dependabot PRs #X, #Y, #Z'

gh auth status >/dev/null 2>&1 && unset GITHUB_TOKEN
git push -u origin chore/upgrade-dependencies
```

**IMPORTANT:** No AI attribution in commit messages (no `Co-Authored-By: Claude`, etc.) — repo convention per `CLAUDE.md`. Use `gh` CLI for pushes; raw SSH push frequently fails in this environment.

### Phase 6: Create PR

```bash
unset GITHUB_TOKEN && gh pr create \
  --title "chore(deps): comprehensive dependency upgrade" \
  --body '## Summary
- Upgrades outdated dependencies to latest versions (within dependabot ignore rules)
- Supersedes dependabot PRs #X, #Y, #Z

## Test Plan
- [x] `pnpm lint` passes
- [x] `pnpm build:tokens` + `pnpm dtcg:validate` + `pnpm tokens:parity` pass
- [x] `pnpm build` + `pnpm test` pass
- [x] `swift build` + `swift test` pass
- [ ] GitHub CI passes'
```

### Phase 7: Monitor CI and Merge

```bash
unset GITHUB_TOKEN && gh pr checks --watch
unset GITHUB_TOKEN && gh pr merge --squash --delete-branch
```

### Phase 8: Close Superseded Dependabot PRs

Close each superseded Dependabot PR:

```bash
unset GITHUB_TOKEN && gh pr close <PR_NUMBER> --comment "Superseded by comprehensive dependency upgrade in #<NEW_PR>"
```

### Phase 9: Cleanup

```bash
cd /Users/jlloyd/Repositories/design-system-Lifegames
git fetch origin && git pull origin main
git worktree remove ~/wt/design-system-Lifegames-upgrade --force
git branch -D chore/upgrade-dependencies 2>/dev/null || true
git worktree list
```

## Automated Analysis

### Breaking Change Detection

Before upgrading, analyze changelogs for breaking changes:

```bash
# Identify major version bumps across the workspace
pnpm outdated --recursive --format json \
  | jq '[.[] | select((.current | split(".")[0]) != (.latest | split(".")[0]))]'
```

For each major version bump:
1. Confirm it is not blocked by `.github/dependabot.yml` `ignore` rules
2. Fetch the package changelog from npm/GitHub
3. Identify the "Breaking changes" section
4. Locate affected files (grep for the package in `apps/`, `packages/`, `schemas/`, `style-dictionary.config.mjs`)

### Dependabot Group Awareness

The repo declares three groups in `.github/dependabot.yml`:
- `ajv` → `ajv`, `ajv-formats`, `ajv-cli`
- `storybook` → `@storybook/*`, `storybook`
- `astro-docs` → `astro`, `@astrojs/*`

A grouped Dependabot PR represents a coordinated bump. When superseding, close the whole grouped PR, not individual packages.

### Auto-Close Dependabot PRs

After successful merge, close superseded grouped Dependabot PRs:

```bash
UPGRADED_PACKAGES=$(git diff HEAD~1 -- '**/package.json' | grep -E '^\+\s+"' | sed -E 's/.*"([^"]+)":.*/\1/' | sort -u)

for pkg in $UPGRADED_PACKAGES; do
  unset GITHUB_TOKEN && gh pr list --author "app/dependabot" --search "$pkg" --json number,title \
    | jq -r '.[].number' \
    | while read pr; do
        echo "Closing Dependabot PR #$pr (superseded)"
        unset GITHUB_TOKEN && gh pr close "$pr" --comment "Superseded by comprehensive dependency upgrade"
      done
done
```

---

## Human Checkpoints

1. **Review breaking-change analysis** — Before applying any major bumps, especially against the dependabot ignore list
2. **Verify local verification passes** — All `pnpm` + `swift` steps in Phase 4 must be green
3. **Monitor GitHub CI** — After push, watch all workflows: `ci.yml`, `contrast-gate.yml`, `visual-regression.yml`
4. **Confirm merge** — Before squash-merging the PR
5. **Verify Dependabot PRs closed** — After merge completes

---

## CI Failure Rollback

If GitHub CI fails after push:

### Step 1: Analyze Failure

```bash
unset GITHUB_TOKEN && gh pr checks
unset GITHUB_TOKEN && gh run view --log-failed
```

### Step 2: Fix in Worktree

```bash
cd ~/wt/design-system-Lifegames-upgrade
# ... edit files ...
git add -A
git commit -m 'fix(deps): resolve CI failure from upgrade'
git push
```

### Step 3: If Fix Not Possible — Rollback

```bash
unset GITHUB_TOKEN && gh pr close --comment "Dependency upgrade caused unfixable CI failure. Rolling back."

cd /Users/jlloyd/Repositories/design-system-Lifegames
git worktree remove ~/wt/design-system-Lifegames-upgrade --force
git push origin --delete chore/upgrade-dependencies
```

### Step 4: Worktree Cleanup (Always)

After successful merge OR rollback:

```bash
cd /Users/jlloyd/Repositories/design-system-Lifegames
git fetch origin && git pull origin main
git worktree remove ~/wt/design-system-Lifegames-upgrade --force
git branch -D chore/upgrade-dependencies 2>/dev/null || true
git worktree list
```

---

## Notes

- **GitHub auth:** If you see 401 errors, the `GITHUB_TOKEN` env var may be invalid. Use `unset GITHUB_TOKEN` to fall back to keyring auth, or use `gh` (preferred over raw `git push`).
- **No AI attribution in commits** — repo convention, also a hard rule across the user's monorepo.
- **Two ecosystems:** Always verify both `pnpm` (Node) AND `swift` after upgrades. Token outputs feed both; one ecosystem passing does NOT imply the other is healthy.
- **Token parity:** `pnpm build:tokens` regenerates outputs for CSS, JS, and Swift. Always re-run after any dep change that could affect `style-dictionary`.
- **Dependency upgrade strategy:** When a dependency breaks something, prefer the durable fix — pin in `package.json` AND add an `ignore` rule to `.github/dependabot.yml` with a comment explaining why and when to re-evaluate (see existing Vite/Starlight/ajv entries for the established pattern).

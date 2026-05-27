# Quarterly Dormant Workflow Checks

Dormant CI workflows decay silently: action versions go stale, syntax breaks, secrets expire.
This document records each gated workflow, how to exercise it in dry-run mode, expected output,
and the last date it was manually verified.

Run these checks once per quarter (January, April, July, October) without flipping `REMOTE_ENABLED`.

---

## Workflows

### `.github/workflows/release.yml` — Changesets release

| Field | Value |
|-------|-------|
| Trigger | `workflow_dispatch` → set `dry_run: true` |
| Gate | `if: vars.REMOTE_ENABLED == 'true'` |
| Expected dry-run output | `changeset status` prints package versions; no publish occurs |
| Last verified | _not yet verified_ |

**Manual trigger command:**
```bash
gh workflow run release.yml --field dry_run=true
```

**Checks to perform:**
- Action versions are not EOL (check `actions/checkout`, `pnpm/action-setup`, `actions/setup-node`, `changesets/action`)
- `pnpm install --frozen-lockfile` succeeds
- `pnpm build:tokens` succeeds
- `pnpm changeset status` exits cleanly

---

### `.github/workflows/publish.yml` — npm publish to GitHub Packages

| Field | Value |
|-------|-------|
| Trigger | `workflow_dispatch` → set `dry_run: true` |
| Gate | `if: vars.REMOTE_ENABLED == 'true' && github.event_name == 'push' && github.ref == 'refs/heads/main'` |
| Expected dry-run output | Publish plan printed; no packages uploaded |
| Last verified | _not yet verified_ |

**Manual trigger command:**
```bash
gh workflow run publish.yml --field dry_run=true
```

**Checks to perform:**
- `NODE_AUTH_TOKEN` / `GITHUB_TOKEN` scopes are sufficient for `npm.pkg.github.com`
- Pending changesets consumed correctly
- Published package names match `@lifegames/tokens`, `@lifegames/web`, `@lifegames/schemas`

---

### `.github/workflows/deploy-docs.yml` — Starlight docs deploy

| Field | Value |
|-------|-------|
| Trigger | `workflow_dispatch` |
| Gate | `if: vars.REMOTE_ENABLED == 'true'` |
| Expected dry-run output | Static site built; artifact upload step logged |
| Last verified | _not yet verified_ |

**Manual trigger command:**
```bash
gh workflow run deploy-docs.yml
```

**Checks to perform:**
- `pnpm --filter docs build` succeeds locally first
- `actions/deploy-pages` action version not EOL
- GitHub Pages source is set to "GitHub Actions" in repo settings

---

### `.github/workflows/chromatic.yml` (or `playwright-snapshots.yml`) — Visual regression

| Field | Value |
|-------|-------|
| Trigger | `workflow_dispatch` (dry-run mode) |
| Gate | `if: vars.REMOTE_ENABLED == 'true'` |
| Expected dry-run output | Snapshot manifest produced; no upload to external service |
| Last verified | _not yet verified_ |

**Manual trigger command:**
```bash
gh workflow run playwright-snapshots.yml
```

**Checks to perform:**
- Playwright/Chromatic version not EOL
- All `stable`-tagged stories still render without errors
- Snapshot count matches `apps/storybook/__snapshots__/` baseline count

---

## Action Version Bump Procedure

When an action version is stale:

1. Find the new tag: `gh api repos/<owner>/<repo>/releases/latest --jq .tag_name`
2. Get the commit SHA: `gh api repos/<owner>/<repo>/git/refs/tags/<tag> --jq .object.sha`
3. Update the workflow file: `uses: <owner>/<repo>@<SHA> # <tag>`
4. Run the workflow in dry-run mode to confirm it still parses and runs

Common actions to check:
- `actions/checkout` — https://github.com/actions/checkout/releases
- `pnpm/action-setup` — https://github.com/pnpm/action-setup/releases
- `actions/setup-node` — https://github.com/actions/setup-node/releases
- `changesets/action` — https://github.com/changesets/action/releases
- `actions/upload-artifact` / `actions/download-artifact` — https://github.com/actions/upload-artifact/releases

---

## Last Quarterly Verification Log

| Date | Workflows checked | Issues found | Resolved |
|------|-------------------|-------------|---------|
| _pending first run_ | — | — | — |

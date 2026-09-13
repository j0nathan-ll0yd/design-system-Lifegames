---
title: Visual Regression Testing
description: Pixel-diff snapshot testing for Storybook stories using @storybook/test-runner and jest-image-snapshot.
---

Visual regression testing catches unintended visual changes in Lifegames widgets and token outputs. Snapshots are committed to the repository and compared on every PR that touches tokens, components, or stories.

## Stack

| Tool                     | Role                                                                   |
| ------------------------ | ---------------------------------------------------------------------- |
| `@storybook/test-runner` | Jest-based test runner that drives Playwright against a live Storybook |
| `jest-image-snapshot`    | Pixel-diff assertion — compares screenshots to committed baselines     |
| Playwright (Chromium)    | Headless browser for rendering and screenshot capture                  |

**Decision:** Playwright snapshots only — no Chromatic or other SaaS vendor. All baselines are committed to the repository.

## Running locally

```bash
# Start Storybook first (or use the static build)
pnpm --filter storybook storybook

# In a separate terminal: run visual regression against localhost:6006
TARGET_URL=http://localhost:6006 pnpm --filter storybook storybook:visual
```

Or against a static build:

```bash
pnpm --filter storybook storybook:build
pnpm dlx serve -l 6006 apps/storybook/storybook-static
TARGET_URL=http://localhost:6006 pnpm --filter storybook storybook:visual
```

## Updating baselines

When an intentional visual change is made (token update, component redesign), update the committed baselines:

```bash
TARGET_URL=http://localhost:6006 pnpm --filter storybook storybook:visual:update
```

The update command moves the old set aside, mints into an empty snapshot directory, and restores the old set if the run fails. This prevents an under-threshold difference from preserving a stale baseline and removes baselines for stories that no longer exist. Then commit the updated `.png` files in `apps/storybook/__snapshots__/`. Include a brief note in the commit message explaining the visual change.

> USER REVIEW CHECKPOINT: When baselines are committed for the first time or updated, the user must visually inspect the screenshots before merging.

## Configuration

**`apps/storybook/.storybook/test-runner.mjs`** — the browser hook and image-snapshot policy for `@storybook/test-runner`:

- `postVisit` hook: captures a full-page screenshot with animations disabled after each story renders
- Pixel failure threshold: 2% (absorbs known font-rendering, gradient, and sub-pixel anti-aliasing variance across environments)
- Structural sentinel: rejects a blank live render and any baseline-to-current non-background footprint swing of 50% or more, even when the raw pixel diff is under 2%
- Snapshot dir: `apps/storybook/__snapshots__/<storyId>.png`
- Diff dir: `apps/storybook/__snapshots__/__diff__/<storyId>-diff.png` (gitignored, uploaded as CI artifact on failure)

`apps/storybook/test-runner-jest.config.mjs` configures the Jest/Playwright process (Chromium, headless); it does not own screenshot hooks or thresholds.

## Snapshot coverage

Snapshots are generated for every story exported from the Storybook. The 19 production island stories (A4) are the primary targets:

| Category | Stories                                                     |
| -------- | ----------------------------------------------------------- |
| Health   | HeartRate, MovementRings, Hydration, NightSummary, Workouts |
| Github   | DevActivityLog, StarredRepoList                             |
| Identity | BioTerminal, IdentityCard, ComingSoon                       |
| Location | ExplorationOdometerV3, PlaceLeaderboardV3                   |
| Reading  | BookModal, Bookshelf, ReadingFeed, TheatreReviews           |
| Overlays | DndOverlay, FocusOverlay                                    |
| System   | SystemStatus                                                |

Plus integration stories (`Integration/shadcn`) and component stories (Card, Modal, Pill, PollStatus, Skeleton).

## CI workflow

The `visual-regression.yml` workflow runs on:

- **PRs** that touch `tokens/**`, `packages/tokens/**`, `packages/web/**`, `apps/storybook/**`
- **Manual dispatch** via `workflow_dispatch` (supports `update_snapshots` input for baseline refreshes)

On failure, diff images are uploaded as a PR artifact (`visual-regression-diffs-<run-id>`) and retained for 14 days.

## Baseline commit protocol

1. Run `storybook:visual:update` locally against a clean build. The command automatically mints the complete set from an empty baseline directory.
2. Review each changed `.png` in `apps/storybook/__snapshots__/` visually.
3. Commit with a message like `visual(snapshots): update baselines after token X change`.
4. The CI check mode will pass against the new baselines on the next run.

## Diff directory

`apps/storybook/__snapshots__/__diff__/` is gitignored (only committed baselines live in `__snapshots__/`). CI uploads diffs as artifacts when the job fails.

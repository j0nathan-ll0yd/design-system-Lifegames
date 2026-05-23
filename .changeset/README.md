# Changesets

This directory is **inactive during Phase 1** of the design-system lifecycle.

## Phase 1 (current) — local-only, no publish

- **Do not add `.changeset/*.md` files.** CI rejects them via the `changeset-phase1-gate` job (`.github/workflows/ci.yml`) whenever `vars.REMOTE_ENABLED` is unset.
- All `@lifegames/*` package versions are frozen at `0.1.0`.
- Consumers (currently only `j0nathan-ll0yd.github.io`) link via **yalc** (see root `CLAUDE.md`).
- See `lifegames-design-system/.omc/plans/design-system-consumer-integration.md` §4.2 for the rationale.

## Phase 2 (deferred) — published to GitHub Packages

When the time comes to publish:

1. Set repo variable `REMOTE_ENABLED=true`. This auto-disables the Phase 1 gate.
2. Begin adding `.changeset/*.md` for each user-facing change (see Changesets CLI docs).
3. Wire `changesets/action@v1` in a new `.github/workflows/release.yml` to publish on merge to `main`.
4. Consumers flip their dependency from `file:.yalc/@lifegames/*` to `^X.Y.Z` from GitHub Packages.

Until Phase 2 is initiated, this directory should contain only `config.json` and this README.

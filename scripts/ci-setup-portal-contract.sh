#!/usr/bin/env bash
# CI yalc-restore for @lifegames/portal-contract.
#
# @lifegames/portal-contract is produced by the backend repo
# (mantle-LifegamesPortal/packages/portal-contract) and consumed by three
# sub-packages in this monorepo via `file:.yalc/@lifegames/portal-contract`.
# Because `.yalc/` is gitignored, CI must repopulate it before
# `pnpm install --frozen-lockfile` (the committed lockfile pins each consumer
# to its own `.yalc/@lifegames/portal-contract` directory).
#
# This script:
#   1. clones/updates the backend (depth 1)
#   2. installs + `yalc publish`es portal-contract to the LOCAL yalc store
#      (its prepublishOnly = codegen + tsc build)
#   3. `yalc add`s it into the 3 consuming sub-packages so the `file:` deps
#      resolve. `yalc add` is idempotent on package.json here (the dep is
#      already declared), so `--frozen-lockfile` stays satisfied.
#
# Override via env:
#   LP_REPO        — git URL  (default: HTTPS to j0nathan-ll0yd/mantle-LifegamesPortal)
#   LP_DIR         — clone dir (default: /tmp/mantle-LifegamesPortal)
#   LP_REF         — branch/tag/sha (default: main)
#   LP_REPO_TOKEN  — fine-grained PAT (Contents:Read on the PRIVATE backend repo).
#                    When set, it is injected into the HTTPS clone URL so CI on
#                    self-hosted runners (no cross-repo git creds) can clone the
#                    private backend. Left unset for local/no-token dev so the
#                    plain HTTPS/SSH/local-path URL still works.

set -euo pipefail

LP_REPO="${LP_REPO:-https://github.com/j0nathan-ll0yd/mantle-LifegamesPortal.git}"
LP_DIR="${LP_DIR:-/tmp/mantle-LifegamesPortal}"
LP_REF="${LP_REF:-main}"

# Inject the PAT into the HTTPS clone URL when provided (private-repo CI clone).
# Keep the plain URL otherwise so local/no-token runs are unaffected.
if [ -n "${LP_REPO_TOKEN:-}" ]; then
  case "$LP_REPO" in
    https://github.com/*) LP_REPO="https://x-access-token:${LP_REPO_TOKEN}@github.com/${LP_REPO#https://github.com/}" ;;
  esac
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Sub-packages that declare a file:.yalc dependency on @lifegames/portal-contract.
CONSUMERS=(packages/web packages/schemas packages/fixtures apps/portfolio)

# Do NOT echo $LP_REPO — it may embed $LP_REPO_TOKEN after injection above.
echo "[ci-setup-pc] LP_DIR=$LP_DIR"
echo "[ci-setup-pc] LP_REF=$LP_REF"

if [ -d "$LP_DIR/.git" ]; then
  echo "[ci-setup-pc] Updating existing backend clone..."
  git -C "$LP_DIR" fetch origin "$LP_REF" --depth 1
  git -C "$LP_DIR" checkout FETCH_HEAD
else
  echo "[ci-setup-pc] Cloning backend (depth 1, ref $LP_REF)..."
  git clone --depth 1 --branch "$LP_REF" "$LP_REPO" "$LP_DIR"
fi

if command -v corepack >/dev/null 2>&1; then
  corepack enable
fi

echo "[ci-setup-pc] Installing + yalc-publishing portal-contract..."
# prepublishOnly (codegen + tsc) needs docs/api/openapi.yaml + schemas/ from the
# backend checkout, plus portal-contract's own devDeps.
(cd "$LP_DIR/packages/portal-contract" && pnpm install && npx -y yalc publish)

echo "[ci-setup-pc] yalc add into consuming sub-packages..."
for consumer in "${CONSUMERS[@]}"; do
  echo "[ci-setup-pc]   -> $consumer"
  (cd "$REPO_ROOT/$consumer" && npx -y yalc add @lifegames/portal-contract)
done

echo "[ci-setup-pc] Done."

#!/usr/bin/env bash
# CI/pre-commit guard: ensures generated artifacts are up to date with their
# sources. Covers two producers:
#   - @lifegames/schemas — TS+Swift widget types + fixture-map (raw export schemas
#     come from @lifegames/portal-contract, resolved from the package; no local
#     vendored/ to sync).
#   - @lifegames/copy — derived flat schema + flat JSON + TS/Zod + Swift
#     (Identity.generated.swift) + bundled resource. The copy build writes into
#     BOTH packages/copy/dist AND Sources/LifegamesCopy, so both are diffed.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

echo "[freshness] Regenerating @lifegames/schemas codegen artifacts..."
pnpm -F @lifegames/schemas codegen

echo "[freshness] Regenerating @lifegames/copy artifacts..."
pnpm -F @lifegames/copy build

echo "[freshness] Checking git diff..."
PATHS=(
  packages/schemas/dist
  packages/schemas/swift
  packages/schemas/fixture-map.json
  packages/copy/dist
  Sources/LifegamesCopy
)

if ! git diff --exit-code -- "${PATHS[@]}"; then
  echo ""
  echo "[freshness] FAIL: generated artifacts are out of date."
  echo "  Run \`pnpm -F @lifegames/schemas codegen\` and \`pnpm -F @lifegames/copy build\`"
  echo "  locally, then commit the regenerated files."
  exit 1
fi

echo "[freshness] OK: generated artifacts are fresh."

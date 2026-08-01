#!/usr/bin/env bash
# CI/pre-commit guard: ensures generated artifacts are up to date with their
# sources. Covers three producers:
#   - @lifegames/schemas — TS+Swift widget types + fixture-map (raw export schemas
#     come from @j0nathan-ll0yd/portal-contract, resolved from the package; no local
#     vendored/ to sync).
#   - @lifegames/copy — derived flat schema + flat JSON + TS/Zod + Swift
#     (Identity.generated.swift) + bundled resource. The copy build writes into
#     BOTH packages/copy/dist AND Sources/LifegamesCopy, so both are diffed.
#   - @lifegames/fixtures — committed raw (src/generated/**/*.json) + post-adapter
#     (src/post-adapter/*.json) fixtures. `generate` is deterministic (fixed clock
#     anchor), so a re-run must produce byte-identical output; drift = stale commit.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

echo "[freshness] Regenerating @lifegames/schemas codegen artifacts..."
pnpm -F @lifegames/schemas codegen

echo "[freshness] Regenerating @lifegames/copy artifacts..."
pnpm -F @lifegames/copy build

echo "[freshness] Regenerating @lifegames/fixtures output..."
pnpm -F @lifegames/fixtures generate

echo "[freshness] Checking git diff..."
PATHS=(
  packages/schemas/dist
  packages/schemas/swift
  packages/schemas/fixture-map.json
  packages/copy/dist
  Sources/LifegamesCopy
  packages/fixtures/src/generated
  packages/fixtures/src/post-adapter
)

if ! git diff --exit-code -- "${PATHS[@]}"; then
  echo ""
  echo "[freshness] FAIL: generated artifacts are out of date."
  echo "  Run \`pnpm -F @lifegames/schemas codegen\`, \`pnpm -F @lifegames/copy build\`,"
  echo "  and \`pnpm -F @lifegames/fixtures generate\` locally, then commit the"
  echo "  regenerated files."
  exit 1
fi

echo "[freshness] OK: generated artifacts are fresh."

#!/usr/bin/env bash
# CI/pre-commit guard: ensures vendored schemas, generated TS+Swift, and fixture-map
# are up to date with their sources. Run pnpm sync:schemas + codegen and require
# zero git diff for the generated paths.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

echo "[schemas:freshness] Syncing vendored from LP..."
pnpm sync:schemas

echo "[schemas:freshness] Regenerating codegen artifacts..."
pnpm -F @lifegames/schemas codegen

echo "[schemas:freshness] Checking git diff..."
# Exclude the LP sync manifest — its syncedAt timestamp updates on every run
# regardless of schema content. Content drift is detected by the schema files themselves.
PATHS=(
  packages/schemas/vendored
  packages/schemas/dist
  packages/schemas/swift
  packages/schemas/fixture-map.json
  ':(exclude)packages/schemas/vendored/.lp-sync-manifest.json'
)

if ! git diff --exit-code -- "${PATHS[@]}"; then
  echo ""
  echo "[schemas:freshness] FAIL: generated artifacts are out of date."
  echo "  Run \`pnpm sync:schemas && pnpm -F @lifegames/schemas codegen\` locally,"
  echo "  then commit the regenerated files."
  exit 1
fi

echo "[schemas:freshness] OK: vendored + generated artifacts are fresh."

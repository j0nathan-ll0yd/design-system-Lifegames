#!/usr/bin/env bash
# CI/pre-commit guard: ensures generated TS+Swift types and fixture-map are up to
# date with their sources. The raw export schemas are produced by
# @lifegames/portal-contract (resolved from the package), so there is no local
# vendored/ to sync — codegen reads the schemas straight from the package.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

echo "[schemas:freshness] Regenerating codegen artifacts..."
pnpm -F @lifegames/schemas codegen

echo "[schemas:freshness] Checking git diff..."
PATHS=(
  packages/schemas/dist
  packages/schemas/swift
  packages/schemas/fixture-map.json
)

if ! git diff --exit-code -- "${PATHS[@]}"; then
  echo ""
  echo "[schemas:freshness] FAIL: generated artifacts are out of date."
  echo "  Run \`pnpm -F @lifegames/schemas codegen\` locally,"
  echo "  then commit the regenerated files."
  exit 1
fi

echo "[schemas:freshness] OK: generated artifacts are fresh."

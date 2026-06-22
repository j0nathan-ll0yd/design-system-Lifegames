#!/usr/bin/env bash
# Runs the portfolio static-showcase visual-regression suite inside the canonical
# Playwright noble image so locally-generated PNGs match CI byte-for-byte.
#
# Parity model (mirrors j0nathan-ll0yd.github.io/scripts/run-in-docker.sh)
# -----------------------------------------------------------------------
#   - The image is pinned to the SAME @playwright/test version the repo resolves
#     (read from pnpm-lock.yaml below), pulled as the upstream multi-arch tag.
#   - --platform linux/arm64 is explicit: the upstream Playwright image is a
#     manifest list, and without it Docker Desktop on Apple Silicon may pick the
#     amd64 entry and re-introduce the QEMU SwiftShader SIGSEGV. Running the
#     arm64 entry natively under Apple Virtualization Framework (no QEMU) gives a
#     userspace + arch identical to the arm64 self-hosted CI runner, so baseline
#     PNGs produced here match CI bytes.
#   - CI=true makes the in-container run mirror CI exactly (playwright.config.ts
#     gates retries/workers/reporter/reuseExistingServer on process.env.CI).
#
# yalc note: `.yalc/@lifegames/portal-contract` is gitignored but PRESENT on the
# host working tree, and the whole DS repo is bind-mounted at /work — so the
# `file:.yalc/@lifegames/portal-contract` dependency resolves inside the
# container with NO token and NO clone of the private backend. The committed
# pnpm-lock.yaml pins every consumer to its `.yalc/` dir, so
# `pnpm install --frozen-lockfile` stays satisfied.
#
# Usage:
#   apps/portfolio/scripts/run-in-docker.sh playwright.config.ts [extra playwright args]
#   apps/portfolio/scripts/run-in-docker.sh playwright.config.ts --update-snapshots
set -euo pipefail

CONFIG="${1:?config path required (e.g. playwright.config.ts)}"
shift || true

# Resolve the DS repo root (two levels up from this script).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# Pin the Playwright image to the version the lockfile resolves. The portfolio
# inherits @playwright/test from the monorepo root; read its resolved version.
VERSION="$(
  node -e "
    const fs = require('fs');
    const lock = fs.readFileSync('${REPO_ROOT}/pnpm-lock.yaml', 'utf8');
    const m = lock.match(/'@playwright\/test@([0-9]+\.[0-9]+\.[0-9]+)'/);
    if (!m) { console.error('could not resolve @playwright/test version'); process.exit(1); }
    process.stdout.write(m[1]);
  "
)"

echo "[run-in-docker] Playwright ${VERSION} | config=${CONFIG} | args=$*"

# Keep pnpm's content-addressable store INSIDE the container (not under the
# bind-mounted /work) so the install never writes a multi-hundred-MB
# `.pnpm-store/` into the host repo. The store dir must be on the same
# filesystem as node_modules for pnpm's hardlinks, so use a container-local path.
docker run --rm --ipc=host --platform linux/arm64 \
  -e CI=true \
  -e PNPM_STORE_DIR=/root/.pnpm-store \
  -v "${REPO_ROOT}:/work" -w /work \
  "mcr.microsoft.com/playwright:v${VERSION}-noble" \
  /bin/bash -c "
    set -euo pipefail
    corepack enable
    pnpm config set store-dir /root/.pnpm-store --global
    pnpm install --frozen-lockfile
    pnpm build:tokens
    cd apps/portfolio
    npx playwright test --config=${CONFIG} $*
  "

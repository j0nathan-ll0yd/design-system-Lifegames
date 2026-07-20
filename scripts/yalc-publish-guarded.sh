#!/usr/bin/env bash
# Guard for `pnpm yalc:publish`: refuse to publish from a linked git worktree.
#
# `yalc publish --push` writes into the machine-global ~/.yalc store and pushes
# the result into EVERY linked consumer checkout (web, mantle-LifegamesPortal).
# Run from a worktree, it can clobber the store with a half-built or divergent
# branch state while another checkout is mid-iteration — a global mutex enforced
# until now only by convention. A linked worktree is detected via git-dir !=
# git-common-dir, which works for any worktree location (Paseo, ~/wt, manual).
#
# Deliberate worktree publish (rare, e.g. testing a consumer against a branch):
#   YALC_PUBLISH_FROM_WORKTREE=1 pnpm yalc:publish
set -euo pipefail

if [ "$(git rev-parse --path-format=absolute --git-dir)" != "$(git rev-parse --path-format=absolute --git-common-dir)" ] \
  && [ -z "${YALC_PUBLISH_FROM_WORKTREE:-}" ]; then
  cat >&2 <<'MSG'
yalc:publish refused: you are in a linked git worktree.

Publishing pushes into the shared global ~/.yalc store and updates every
linked consumer checkout (web-Lifegames-Portal, mantle-LifegamesPortal),
so a worktree publish can silently overwrite the main checkout's packages
estate-wide.

Publish from the main checkout instead, or — if this worktree publish is
deliberate — re-run with:

  YALC_PUBLISH_FROM_WORKTREE=1 pnpm yalc:publish
MSG
  exit 1
fi

exec pnpm run yalc:publish:run

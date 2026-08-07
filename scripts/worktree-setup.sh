#!/usr/bin/env sh

COMMON_DIR=$(git rev-parse --git-common-dir)
WORKTREE_DIR=$(git rev-parse --show-toplevel)
MAIN_DIR=$(cd "$COMMON_DIR/.." && pwd)

if [ -d "$MAIN_DIR/.claude/rules" ] && [ ! -d "$WORKTREE_DIR/.claude/rules" ]; then
    echo "Seeding .claude/rules from main repository..."
    mkdir -p "$WORKTREE_DIR/.claude"
    cp -r "$MAIN_DIR/.claude/rules" "$WORKTREE_DIR/.claude/"
fi

echo "Running pnpm install --prefer-offline..."
if command -v pnpm >/dev/null 2>&1; then
    pnpm install --prefer-offline
else
    echo "pnpm not found, skipping install."
fi

echo "Running direnv allow..."
if command -v direnv >/dev/null 2>&1; then
    direnv allow
else
    echo "direnv not found, skipping direnv allow."
fi

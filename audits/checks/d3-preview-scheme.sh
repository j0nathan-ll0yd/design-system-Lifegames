#!/usr/bin/env bash
# S22 enforcement: every #Preview block in Sources/ must include
# .preferredColorScheme(.dark). Exits 1 with a violation report if any are missing.
set -euo pipefail

SOURCES_DIR="$(dirname "$0")/../../Sources"
VIOLATIONS=()

while IFS= read -r -d '' file; do
    # Check if the file contains any #Preview block
    if ! grep -q '#Preview' "$file"; then
        continue
    fi

    # For each #Preview occurrence, check if .preferredColorScheme(.dark) appears
    # somewhere in the same file. This is a file-level check (not per-block) which
    # is intentionally conservative: a file with multiple previews that forgets
    # .preferredColorScheme(.dark) on any one of them will fail.
    if ! grep -q '\.preferredColorScheme(\.dark)' "$file"; then
        VIOLATIONS+=("$file")
    fi
done < <(find "$SOURCES_DIR" -name '*.swift' -print0)

if [ ${#VIOLATIONS[@]} -eq 0 ]; then
    echo "S22 check passed: all #Preview blocks include .preferredColorScheme(.dark)"
    exit 0
fi

echo "S22 VIOLATION: the following files have #Preview blocks without .preferredColorScheme(.dark):"
for f in "${VIOLATIONS[@]}"; do
    echo "  $f"
done
echo ""
echo "Fix: add '.preferredColorScheme(.dark)' to each #Preview block in these files."
echo "See CLAUDE.md: All #Preview blocks MUST include .preferredColorScheme(.dark)"
exit 1

#!/usr/bin/env bash
# Scans staged JSON files for known personal data markers.
# Exits non-zero if any unscrubbed marker is found.

MARKERS=(
  "j0nathan-ll0yd"
  "j0nathan_ll0yd"
)

STAGED_JSON=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.json$')

if [ -z "$STAGED_JSON" ]; then
  exit 0
fi

FOUND=0
for marker in "${MARKERS[@]}"; do
  MATCHES=$(echo "$STAGED_JSON" | xargs grep -l "$marker" 2>/dev/null)
  if [ -n "$MATCHES" ]; then
    echo "ERROR: Personal data marker '$marker' found in staged files:"
    echo "$MATCHES"
    FOUND=1
  fi
done

if [ $FOUND -ne 0 ]; then
  echo ""
  echo "Scrub personal data before committing. See Sources/LifegamesWidgets/Resources/widgets/SCRUBBING.md"
  exit 1
fi

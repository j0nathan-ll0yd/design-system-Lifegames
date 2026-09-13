#!/usr/bin/env bash
# Scans staged (default) or full-tree (--full-tree) text files for personal
# data: known literal markers, email addresses, phone numbers, and
# high-precision lat/lon coordinate pairs.
#
# Modes:
#   scan-personal-data.sh              — staged files only (pre-commit hook; fast)
#   scan-personal-data.sh --full-tree  — every tracked file (weekly audit-ds.yml, lp-audit D6)
#
# The lat/lon coordinate heuristic is skipped inside the widget fixture pool
# (Sources/LifegamesWidgets/Resources/widgets/), which intentionally contains
# synthetic SF-downtown coordinates — see that directory's SCRUBBING.md. It
# does NOT scan apps/portfolio/, which is the user's actual portfolio and is
# expected to contain real identity. All other checks (markers, email, phone)
# apply everywhere, fixture pool included.
#
# Known-legitimate hits that aren't covered by the two built-in exclusions
# above (webmaster@lifegames.org and noreply-style addresses) are suppressed
# via audits/lib/scan-allowlist.txt: one `path:check-label` per line (see that
# file's header for the exact format). An allowlisted path/check pair is
# skipped entirely for that finding.
#
# Exits non-zero if any un-allowlisted marker/heuristic hit is found in
# scope.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ALLOWLIST_FILE="$REPO_ROOT/audits/lib/scan-allowlist.txt"
FIXTURE_POOL_PREFIX="Sources/LifegamesWidgets/Resources/widgets/"

FULL_TREE=0
if [ "${1:-}" = "--full-tree" ]; then
  FULL_TREE=1
fi

MARKERS=(
  "j0nathan-ll0yd"
  "j0nathan_ll0yd"
)

# Email addresses, excluding the maintainer's public contact address and
# noreply-style addresses (CI/bot notification senders).
# RFC 2606 reserved documentation domains (example.com/.org/.net) are excluded
# alongside the maintainer's own address and noreply senders: fixture authors
# use them as the standard "obviously synthetic" email convention throughout
# this repo (e.g. Sources/LifegamesWidgets/Resources/widgets/media/*.json),
# and a real leak would essentially never land on a reserved domain.
# The same RFC also reserves the .test/.example/.invalid/.localhost TLDs, which
# are guaranteed never to resolve; c147-package-drift.mjs's self-test uses
# @example.invalid for the throwaway git repo's committer identity. Excluding
# them by TLD keeps the email check ACTIVE on those files, which allowlisting
# the path would not — an allowlist entry suppresses the check for the whole
# file, including any real address added to it later.
EMAIL_REGEX='[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
EMAIL_ALLOW_REGEX='(webmaster@lifegames\.org|(^|[^a-zA-Z])[Nn]o-?[Rr]eply@|@no-?reply\.|@example\.(com|org|net)|@[A-Za-z0-9.-]+\.(test|example|invalid|localhost)([^A-Za-z0-9.-]|$))'

# US-style phone number pattern: NNN-NNN-NNNN / (NNN) NNN-NNNN / NNN.NNN.NNNN,
# optionally prefixed +1. (Not spelled out as a literal example here so this
# comment doesn't match its own pattern.)
PHONE_REGEX='(\+?1[-. ]?)?\(?[0-9]{3}\)?[-. ][0-9]{3}[-. ][0-9]{4}'

# lat/lon pairs at >3 decimal places (real-location-grade precision), matched
# as an adjacent "lat, lon" or "[lon, lat]" pair — covers map-link URLs,
# GeoJSON coordinate arrays, CSV rows, and log lines. Multi-line JSON
# key/value pairs (the common case inside the fixture pool, which this
# heuristic skips anyway) are intentionally out of scope for a bash regex.
COORD_REGEX='-?[0-9]{1,3}\.[0-9]{4,}, *-?[0-9]{1,3}\.[0-9]{4,}'

# Files this scanner never checks: itself and its allowlist (both necessarily
# contain the literal marker strings they document/detect) and lockfiles
# (machine-generated, third-party package metadata only — e.g. an upstream
# maintainer's deprecation notice can contain a real-looking email that has
# nothing to do with this repo).
SKIP_FILES_REGEX='^(audits/checks/d6-scan-personal-data\.sh|audits/lib/scan-allowlist\.txt|pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$'

if [ "$FULL_TREE" -eq 1 ]; then
  FILES=$(git -C "$REPO_ROOT" ls-files | grep -vE "$SKIP_FILES_REGEX" || true)
else
  FILES=$(git -C "$REPO_ROOT" diff --cached --name-only --diff-filter=ACM | grep -vE "$SKIP_FILES_REGEX" || true)
fi

if [ -z "$FILES" ]; then
  exit 0
fi

is_allowlisted() {
  local file="$1" label="$2"
  [ -f "$ALLOWLIST_FILE" ] || return 1
  grep -qxF "$file:$label" "$ALLOWLIST_FILE" 2>/dev/null && return 0
  grep -qxF "$file:*" "$ALLOWLIST_FILE" 2>/dev/null
}

FOUND=0
report() {
  local label="$1" file="$2" line="$3"
  if is_allowlisted "$file" "$label"; then
    return
  fi
  echo "ERROR: [$label] $file: $line"
  FOUND=1
}

while IFS= read -r file; do
  [ -n "$file" ] || continue
  [ -f "$REPO_ROOT/$file" ] || continue

  for marker in "${MARKERS[@]}"; do
    match=$(grep -InE -m1 "$marker" "$REPO_ROOT/$file" 2>/dev/null || true)
    [ -n "$match" ] && report "marker:$marker" "$file" "$match"
  done

  match=$(grep -InE -m1 "$EMAIL_REGEX" "$REPO_ROOT/$file" 2>/dev/null | grep -vE "$EMAIL_ALLOW_REGEX" || true)
  [ -n "$match" ] && report "email" "$file" "$match"

  match=$(grep -InE -m1 "$PHONE_REGEX" "$REPO_ROOT/$file" 2>/dev/null || true)
  [ -n "$match" ] && report "phone" "$file" "$match"

  case "$file" in
    "$FIXTURE_POOL_PREFIX"*) : ;; # synthetic coordinates expected — skip
    *)
      match=$(grep -InE -m1 "$COORD_REGEX" "$REPO_ROOT/$file" 2>/dev/null || true)
      [ -n "$match" ] && report "coordinate" "$file" "$match"
      ;;
  esac
done <<< "$FILES"

if [ "$FOUND" -ne 0 ]; then
  echo ""
  echo "Scrub personal data before committing, or add a documented entry to audits/lib/scan-allowlist.txt."
  echo "See Sources/LifegamesWidgets/Resources/widgets/SCRUBBING.md for the fixture-pool scrubbing log."
  exit 1
fi

if [ "$FULL_TREE" -eq 1 ]; then
  echo "OK: no personal data markers found (full tree, $(echo "$FILES" | wc -l | tr -d ' ') files)."
else
  echo "OK: no personal data markers found in staged files."
fi

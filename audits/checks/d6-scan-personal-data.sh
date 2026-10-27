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
# A changeset's frontmatter must name the scoped package it releases, and the
# scope contains the marker. So in `.changeset/<name>.md` only, a frontmatter
# line of the exact shape `'@j0nathan-ll0yd/<package>': <bump>` (or the
# double-quoted form) is not scanned. <bump> is one of the release types
# @changesets/parse accepts: major, minor, patch, none. The frontmatter is the
# block between a first line of `---` and the next line of `---`. Every other
# line of a changeset, its body included, is scanned like any other file.
#
# Known-legitimate hits that aren't covered by the built-in exclusions
# above (the addresses in EMAIL_ALLOW_REGEX and noreply-style senders) are suppressed
# via audits/lib/scan-allowlist.txt: one `path:check-label` per line (see that
# file's header for the exact format). An allowlisted path/check pair is
# skipped entirely for that finding.
#
# Every allowlist entry must name a tracked path (a path in the git index). An
# entry whose path is not tracked is stale and fails the scan, in both modes,
# whether or not any file is staged. Staged mode reads the allowlist and each
# scanned file from the index, so it checks exactly what the commit records:
# a commit that deletes or renames an allowlisted file without removing its
# entry fails. Full-tree mode reads the working tree, as before.
#
# Exits non-zero if any un-allowlisted marker/heuristic hit is found in
# scope, or if any allowlist entry is stale.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
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
# portfolio.chamomile484@passmail.net: the Organization contact point alias (owner decision 2026-10-24).
EMAIL_ALLOW_REGEX='(webmaster@lifegames\.org|portfolio\.chamomile484@passmail\.net|(^|[^a-zA-Z])[Nn]o-?[Rr]eply@|@no-?reply\.|@example\.(com|org|net)|@[A-Za-z0-9.-]+\.(test|example|invalid|localhost)([^A-Za-z0-9.-]|$))'

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

# A changeset frontmatter line that names a scoped package and its release
# type. Two patterns, so the quotes must match.
CHANGESET_FILE_REGEX='^\.changeset/[^/]+\.md$'
CHANGESET_RELEASE_SQ="^'@j0nathan-ll0yd/[a-z0-9][a-z0-9._-]*': (major|minor|patch|none)\$"
CHANGESET_RELEASE_DQ='^"@j0nathan-ll0yd/[a-z0-9][a-z0-9._-]*": (major|minor|patch|none)$'
ALLOWLIST_PATH="audits/lib/scan-allowlist.txt"
ALLOWLIST_LABEL_REGEX=':(marker:[^:]+|email|phone|coordinate|[*])$'

if [ "$FULL_TREE" -eq 1 ]; then
  FILES=$(git -C "$REPO_ROOT" ls-files | grep -vE "$SKIP_FILES_REGEX" || true)
  ALLOWLIST=$(cat "$REPO_ROOT/$ALLOWLIST_PATH" 2>/dev/null || true)
else
  FILES=$(git -C "$REPO_ROOT" diff --cached --name-only --diff-filter=ACM | grep -vE "$SKIP_FILES_REGEX" || true)
  ALLOWLIST=$(git -C "$REPO_ROOT" cat-file blob ":$ALLOWLIST_PATH" 2>/dev/null || true)
fi

SCAN_TMP=$(mktemp -d)
trap 'rm -rf "$SCAN_TMP"' EXIT

is_allowlisted() {
  local file="$1" label="$2"
  [ -n "$ALLOWLIST" ] || return 1
  grep -qxF "$file:$label" <<< "$ALLOWLIST" && return 0
  grep -qxF "$file:*" <<< "$ALLOWLIST"
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

# Stale allowlist entries: strip the check label and look the path up in the
# index. An entry with an unknown label keeps its whole text as the path, so
# it is reported too.
STALE_ENTRIES=$(awk -v label_regex="$ALLOWLIST_LABEL_REGEX" '
  FILENAME == ARGV[1] { tracked[$0] = 1; next }
  /^[[:space:]]*(#|$)/ { next }
  {
    path = $0
    sub(label_regex, "", path)
    if (!(path in tracked)) print
  }
' <(git -C "$REPO_ROOT" ls-files) <(printf '%s\n' "$ALLOWLIST"))

STALE=0
if [ -n "$STALE_ENTRIES" ]; then
  STALE=1
  while IFS= read -r entry; do
    echo "ERROR: [stale-allowlist-entry] $ALLOWLIST_PATH: '$entry' names no tracked file"
  done <<< "$STALE_ENTRIES"
fi

# Blank the scoped-package release lines of a changeset's frontmatter, so line
# numbers stay true and every other line is still scanned. The frontmatter is
# buffered until its closing `---`; an unclosed block is printed unchanged.
blank_changeset_releases() {
  awk -v sq="$CHANGESET_RELEASE_SQ" -v dq="$CHANGESET_RELEASE_DQ" '
    NR == 1 && $0 == "---" { infm = 1; n = 0; print; next }
    infm && $0 == "---" {
      for (i = 1; i <= n; i++) print ((buf[i] ~ sq || buf[i] ~ dq) ? "" : buf[i])
      infm = 0; print; next
    }
    infm { buf[++n] = $0; next }
    { print }
    END { if (infm) for (i = 1; i <= n; i++) print buf[i] }
  ' "$1"
}

while IFS= read -r file; do
  [ -n "$file" ] || continue

  if [ "$FULL_TREE" -eq 1 ]; then
    [ -f "$REPO_ROOT/$file" ] || continue
    source_path="$REPO_ROOT/$file"
  else
    source_path="$SCAN_TMP/staged"
    git -C "$REPO_ROOT" cat-file blob ":$file" > "$source_path" 2>/dev/null || continue
  fi

  scan_path="$source_path"
  if [[ "$file" =~ $CHANGESET_FILE_REGEX ]]; then
    scan_path="$SCAN_TMP/changeset"
    blank_changeset_releases "$source_path" > "$scan_path"
  fi

  for marker in "${MARKERS[@]}"; do
    match=$(grep -InE -m1 "$marker" "$scan_path" 2>/dev/null || true)
    [ -n "$match" ] && report "marker:$marker" "$file" "$match"
  done

  match=$(grep -InE -m1 "$EMAIL_REGEX" "$scan_path" 2>/dev/null | grep -vE "$EMAIL_ALLOW_REGEX" || true)
  [ -n "$match" ] && report "email" "$file" "$match"

  match=$(grep -InE -m1 "$PHONE_REGEX" "$scan_path" 2>/dev/null || true)
  [ -n "$match" ] && report "phone" "$file" "$match"

  case "$file" in
    "$FIXTURE_POOL_PREFIX"*) : ;; # synthetic coordinates expected — skip
    *)
      match=$(grep -InE -m1 "$COORD_REGEX" "$scan_path" 2>/dev/null || true)
      [ -n "$match" ] && report "coordinate" "$file" "$match"
      ;;
  esac
done <<< "$FILES"

if [ "$STALE" -ne 0 ]; then
  echo ""
  echo "Remove each stale entry from $ALLOWLIST_PATH: its file was deleted, renamed or never tracked."
fi

if [ "$FOUND" -ne 0 ]; then
  echo ""
  echo "Scrub personal data before committing, or add a documented entry to audits/lib/scan-allowlist.txt."
  echo "See Sources/LifegamesWidgets/Resources/widgets/SCRUBBING.md for the fixture-pool scrubbing log."
fi

if [ "$FOUND" -ne 0 ] || [ "$STALE" -ne 0 ]; then
  exit 1
fi

if [ "$FULL_TREE" -eq 1 ]; then
  echo "OK: no personal data markers found (full tree, $(grep -c . <<< "$FILES" || true) files)."
else
  echo "OK: no personal data markers found in staged files."
fi

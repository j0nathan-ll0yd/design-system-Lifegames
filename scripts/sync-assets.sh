#!/usr/bin/env bash
# mantle-cli-output: asset sync progress for stdout
# Syncs image assets from the source portfolio for the design system docs.
# Run from repo root. Source repo must be checked out at the expected path.
set -euo pipefail

SOURCE="${HOME}/Repositories/j0nathan-ll0yd.github.io"
DEST="apps/docs/public"

if [ ! -d "$SOURCE" ]; then
  echo "ERROR: Source repo not found at $SOURCE"
  exit 1
fi

echo "Syncing assets from $SOURCE..."

# Books (ISBN/ASIN-named webp/avif covers)
mkdir -p "$DEST/images"
cp -r "$SOURCE/public/images/books/" "$DEST/images/books/"
echo "  books: $(ls "$DEST/images/books/" | wc -l | tr -d ' ') files"

# Theatre (play-slug-named webp/avif posters)
cp -r "$SOURCE/public/images/theatre/" "$DEST/images/theatre/"
echo "  theatre: $(ls "$DEST/images/theatre/" | wc -l | tr -d ' ') files"

# Avatar
mkdir -p "$DEST/assets"
cp "$SOURCE/public/assets/avatar.svg" "$SOURCE/public/assets/avatar.webp" "$SOURCE/public/assets/avatar.jpg" "$DEST/assets/"
echo "  avatar: 3 files"

# Verify no .git artifacts
GIT_ARTIFACTS=$(find "$DEST" -name ".git*" 2>/dev/null | wc -l | tr -d ' ')
if [ "$GIT_ARTIFACTS" -gt 0 ]; then
  echo "WARNING: Found $GIT_ARTIFACTS .git artifacts in $DEST"
  find "$DEST" -name ".git*"
  exit 1
fi

echo "Done. All assets synced."

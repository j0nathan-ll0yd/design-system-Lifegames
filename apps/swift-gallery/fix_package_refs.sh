#!/usr/bin/env bash
#
# fix_package_refs.sh
#
# XcodeGen (through at least 2.45.x) generates `XCSwiftPackageProductDependency`
# objects for LOCAL Swift packages WITHOUT the `package = <ref>` back-reference
# to their `XCLocalSwiftPackageReference`. `xcodebuild` resolves these by product
# name regardless, but Xcode's GUI cannot — it reports:
#
#     Missing package product 'LifegamesTokens'      (etc.)
#
# This script post-processes the generated project to add the missing
# back-reference. It is idempotent and safe to re-run.
#
# Workflow (run from this directory):
#     xcodegen generate && bash fix_package_refs.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PBXPROJ="$SCRIPT_DIR/SwiftGallery.xcodeproj/project.pbxproj"

if [ ! -f "$PBXPROJ" ]; then
  echo "fix_package_refs: $PBXPROJ not found — run 'xcodegen generate' first" >&2
  exit 1
fi

python3 - "$PBXPROJ" <<'PY'
import re
import sys

path = sys.argv[1]
src = open(path).read()

# Locate the local package reference (id + trailing comment) so product
# dependencies can point back at it.
local = re.search(
    r'(\b[0-9A-F]{24}\b) (/\* XCLocalSwiftPackageReference [^*]*\*/) = \{\s*isa = XCLocalSwiftPackageReference;',
    src,
)
if not local:
    print("fix_package_refs: no XCLocalSwiftPackageReference found; nothing to do")
    sys.exit(0)

ref_line = f'\t\t\tpackage = {local.group(1)} {local.group(2)};'

def link(block: str) -> str:
    if 'package = ' in block:  # already linked — keep idempotent
        return block
    return block.replace(
        'isa = XCSwiftPackageProductDependency;',
        'isa = XCSwiftPackageProductDependency;\n' + ref_line,
        1,
    )

pattern = re.compile(
    r'\b[0-9A-F]{24}\b [^\n]*= \{\s*isa = XCSwiftPackageProductDependency;.*?\};',
    re.DOTALL,
)
out = pattern.sub(lambda m: link(m.group(0)), src)

if out != src:
    open(path, 'w').write(out)
    print("fix_package_refs: linked local package products to their package reference")
else:
    print("fix_package_refs: product dependencies already linked; no change")
PY

#!/usr/bin/env bash
set -euo pipefail

CODEGEN_FILE="packages/schemas/swift/WidgetModels.swift"
SOURCES_FILE="Sources/LifegamesSchemas/WidgetModels.swift"

if ! diff -q "$CODEGEN_FILE" "$SOURCES_FILE" > /dev/null 2>&1; then
  echo "ERROR: $SOURCES_FILE has diverged from $CODEGEN_FILE"
  echo "Run: cp $CODEGEN_FILE $SOURCES_FILE"
  exit 1
fi

echo "OK: WidgetModels.swift is fresh (codegen = Sources)"

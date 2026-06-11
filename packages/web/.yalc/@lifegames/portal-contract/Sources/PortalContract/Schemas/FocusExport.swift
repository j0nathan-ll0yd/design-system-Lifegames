// AUTO-GENERATED — do not edit. Regenerate: pnpm -C packages/portal-contract codegen

// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let focusExport = try FocusExport(json)

import Foundation

// MARK: - FocusExport
public struct FocusExport {
    public let currentFocus, generatedAt: String

    public init(currentFocus: String, generatedAt: String) {
        self.currentFocus = currentFocus
        self.generatedAt = generatedAt
    }
}

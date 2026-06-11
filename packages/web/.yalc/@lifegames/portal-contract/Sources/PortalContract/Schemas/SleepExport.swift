// AUTO-GENERATED — do not edit. Regenerate: pnpm -C packages/portal-contract codegen

// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let sleepExport = try SleepExport(json)

import Foundation

public enum SleepExportValue {
    case sleepExportClass(SleepExportClass)
    case string(String)
}

// MARK: - SleepExportClass
public struct SleepExportClass {
    public let seconds: Double

    public init(seconds: Double) {
        self.seconds = seconds
    }
}

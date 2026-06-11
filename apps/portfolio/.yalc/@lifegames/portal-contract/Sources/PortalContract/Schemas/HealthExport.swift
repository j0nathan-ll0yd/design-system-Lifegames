// AUTO-GENERATED — do not edit. Regenerate: pnpm -C packages/portal-contract codegen

// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let healthExport = try HealthExport(json)

import Foundation

// MARK: - HealthExport
public struct HealthExport {
    public let date, generatedAt: String
    public let goals: Goals?
    public let lastSync: String?
    public let quantities: [String: Quantity]
    public let solar: Solar?

    public init(date: String, generatedAt: String, goals: Goals?, lastSync: String?, quantities: [String: Quantity], solar: Solar?) {
        self.date = date
        self.generatedAt = generatedAt
        self.goals = goals
        self.lastSync = lastSync
        self.quantities = quantities
        self.solar = solar
    }
}

// MARK: - Goals
public struct Goals {
    public let daylightMin: Double
    public let exerciseMin, moveKcal, standHr: Double?

    public init(daylightMin: Double, exerciseMin: Double?, moveKcal: Double?, standHr: Double?) {
        self.daylightMin = daylightMin
        self.exerciseMin = exerciseMin
        self.moveKcal = moveKcal
        self.standHr = standHr
    }
}

// MARK: - Quantity
public struct Quantity {
    public let unit: String
    public let value: Double

    public init(unit: String, value: Double) {
        self.unit = unit
        self.value = value
    }
}

// MARK: - Solar
public struct Solar {
    public let currentProgressPct: Double
    public let sunriseHHmm, sunsetHHmm: String

    public init(currentProgressPct: Double, sunriseHHmm: String, sunsetHHmm: String) {
        self.currentProgressPct = currentProgressPct
        self.sunriseHHmm = sunriseHHmm
        self.sunsetHHmm = sunsetHHmm
    }
}

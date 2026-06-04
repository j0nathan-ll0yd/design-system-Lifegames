import Foundation

public extension Adapters {
    // MARK: - Hydration

    /// Convenience: decode the full `health/hydration*.json` envelope and return Props.
    /// The fixture envelope is `{health: {hydration: {...}}}`.
    /// Returns nil if the JSON structure is unexpected; inner adapter tolerates missing keys.
    static func hydration(fromFixture data: Data) -> HydrationProps? {
        guard
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let health = json["health"] as? [String: Any]
        else { return nil }
        return adaptHydration(from: health)
    }

    // MARK: - NightSummary

    /// Convenience: decode the full `health/night-summary*.json` envelope and return Props.
    ///
    /// Wire shape: `{health: {sleepScore: Int, sleepDurationFormatted: String,
    ///   sleepPhaseFormatted: {deep, rem, core, awake}, derived: {deepPct, remPct}}}`.
    ///
    /// The fixtures store pre-formatted strings and pre-computed percentages — both already
    /// respect the awake-exclusion contract (awake is excluded from duration and denominator).
    /// We read the values as-is rather than re-computing, so the adapter faithfully mirrors what
    /// the web runtime produced when generating the fixtures.
    static func nightSummary(fromFixture data: Data) -> NightSummaryProps? {
        guard
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let health = json["health"] as? [String: Any]
        else { return nil }

        let sleepScore = (health["sleepScore"] as? Int) ?? 0
        let duration = (health["sleepDurationFormatted"] as? String) ?? "0m"
        let phases = health["sleepPhaseFormatted"] as? [String: Any] ?? [:]
        let derived = health["derived"] as? [String: Any] ?? [:]

        return NightSummaryProps(
            sleepScore: sleepScore,
            duration: duration,
            deepFormatted: formatPhase(phases["deep"]),
            remFormatted: formatPhase(phases["rem"]),
            coreFormatted: formatPhase(phases["core"]),
            awakeFormatted: formatPhase(phases["awake"]),
            deepPct: (derived["deepPct"] as? Int) ?? 0,
            remPct: (derived["remPct"] as? Int) ?? 0
        )
    }

    // MARK: - Workouts

    /// Convenience: decode the full `health/workouts*.json` envelope and return Props.
    /// The fixture envelope is `{health: {workouts: [...]}}`.
    /// Returns nil if the JSON structure is unexpected; inner adapter tolerates missing keys.
    static func workouts(fromFixture data: Data) -> WorkoutsProps? {
        guard
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let health = json["health"] as? [String: Any],
            let workoutsArray = health["workouts"] as? [[String: Any]]
        else { return nil }
        return adaptWorkouts(from: workoutsArray)
    }

    // MARK: - MovementRings

    /// Convenience: decode the full `health/movement-rings*.json` envelope and return Props.
    ///
    /// Wire shape: `{health: {movement: {moveKcal, exerciseMin, standHr, steps, distanceMeters,
    ///   flights, daylightMin, goals: {moveKcal, exerciseMin, standHr, daylightMin},
    ///   solar?: {sunriseHHmm, sunsetHHmm, currentProgressPct}}}}`.
    ///
    /// Returns nil if the envelope is missing the `movement` sub-object. Missing inner fields
    /// fall back to zero / default Goals so partial fixtures (`{}` stubs) still produce a Props
    /// value rather than failing the catalog test.
    static func movementRings(fromFixture data: Data) -> MovementRingsProps? {
        guard
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let health = json["health"] as? [String: Any],
            let movement = health["movement"] as? [String: Any]
        else { return nil }

        let goalsDict = movement["goals"] as? [String: Any] ?? [:]
        let goals = MovementRingsProps.Goals(
            moveKcal: numberValue(goalsDict["moveKcal"]) ?? 500,
            exerciseMin: numberValue(goalsDict["exerciseMin"]) ?? 30,
            standHr: numberValue(goalsDict["standHr"]) ?? 12,
            daylightMin: numberValue(goalsDict["daylightMin"]) ?? 20
        )

        var solar: MovementRingsProps.Solar?
        if let solarDict = movement["solar"] as? [String: Any],
           let sunrise = solarDict["sunriseHHmm"] as? String,
           let sunset = solarDict["sunsetHHmm"] as? String
        {
            solar = MovementRingsProps.Solar(
                sunriseHHmm: sunrise,
                sunsetHHmm: sunset,
                currentProgressPct: numberValue(solarDict["currentProgressPct"]) ?? 0
            )
        }

        return MovementRingsProps(
            moveKcal: numberValue(movement["moveKcal"]) ?? 0,
            exerciseMin: numberValue(movement["exerciseMin"]) ?? 0,
            standHr: numberValue(movement["standHr"]) ?? 0,
            steps: Int(numberValue(movement["steps"]) ?? 0),
            distanceMeters: numberValue(movement["distanceMeters"]) ?? 0,
            flights: Int(numberValue(movement["flights"]) ?? 0),
            daylightMin: numberValue(movement["daylightMin"]) ?? 0,
            goals: goals,
            solar: solar
        )
    }
}

// MARK: - Private helpers

private extension Adapters {
    /// Normalise a phase duration value from the fixture.
    /// Fixture values are strings like `"1h 24m"` or `"0h 36m"`.
    /// Strips a leading `"0h "` prefix so `"0h 36m"` → `"36m"`, matching `SleepDuration.format`.
    /// Tolerant numeric extraction: JSONSerialization may produce `Int` or `Double` depending
    /// on whether the literal has a fractional part. Accept either; return nil for anything else.
    static func numberValue(_ value: Any?) -> Double? {
        if let d = value as? Double { return d }
        if let i = value as? Int { return Double(i) }
        if let n = value as? NSNumber { return n.doubleValue }
        return nil
    }

    static func formatPhase(_ value: Any?) -> String {
        guard let str = value as? String else { return "0m" }
        // "0h Xm" → "Xm" to match the SleepDuration.format output contract
        if str.hasPrefix("0h ") {
            return String(str.dropFirst(3))
        }
        return str
    }
}

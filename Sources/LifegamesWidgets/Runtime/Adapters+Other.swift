import Foundation

public extension Adapters {
    // MARK: - DndOverlay

    /// Decode the `other/dnd-overlay*.json` envelope.
    /// All current fixtures are `{}` (the overlay state is injected at runtime);
    /// we return a sensible default Props so the gallery can still render the view.
    static func dndOverlay(fromFixture data: Data) -> DndOverlayProps? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }
        return DndOverlayProps(
            isActive: json["isActive"] as? Bool ?? false,
            currentTime: json["currentTime"] as? String ?? "",
            timeZone: json["timeZone"] as? String ?? "Pacific Standard Time"
        )
    }

    // MARK: - FocusOverlay

    /// Decode the `other/focus-overlay*.json` envelope.
    /// All current fixtures are `{}` (state is runtime-injected); return default Props.
    static func focusOverlay(fromFixture data: Data) -> FocusOverlayProps? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }
        return FocusOverlayProps(
            isActive: json["isActive"] as? Bool ?? false,
            currentTime: json["currentTime"] as? String ?? "",
            timeZone: json["timeZone"] as? String ?? "Pacific Standard Time",
            shiftStart: json["shiftStart"] as? String ?? "07:00",
            shiftEnd: json["shiftEnd"] as? String ?? "15:00"
        )
    }

    // MARK: - GitHubHeatmap

    /// Decode the `other/github-heatmap*.json` envelope.
    /// Wire shape: `{ "github": { "contributions": [[Int]], "stats": { "repos", "stars", "contributions" } } }`
    static func gitHubHeatmap(fromFixture data: Data) -> GitHubHeatmapProps? {
        guard
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let github = json["github"] as? [String: Any]
        else { return nil }

        let contributions = github["contributions"] as? [[Int]] ?? []
        let stats = github["stats"] as? [String: Any] ?? [:]
        let repos = stats["repos"] as? Int ?? 0
        let stars = stats["stars"] as? Int ?? 0
        let totalContributions = stats["contributions"] as? Int ?? 0

        return GitHubHeatmapProps(
            contributions: contributions,
            totalContributions: totalContributions,
            repos: repos,
            stars: stars
        )
    }

    // MARK: - OGImage

    /// Decode the `other/og-image*.json` envelope.
    /// Wire shape includes an `avatarUrl` field not present in Props; Codable ignores unknown keys.
    static func ogImage(fromFixture data: Data) -> OGImageProps? {
        try? JSONDecoder().decode(OGImageProps.self, from: data)
    }

    // MARK: - SystemStatus

    /// Decode the `other/system-status*.json` envelope.
    /// Wire shape: `{ "system": { "lines": [{ "key", "value", "dotClass" }] } }`
    /// Maps `dotClass` (e.g. "sys-dot-green") to a `status` string for `SystemStatusProps.StatusLine`.
    static func systemStatus(fromFixture data: Data) -> SystemStatusProps? {
        guard
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let system = json["system"] as? [String: Any],
            let rawLines = system["lines"] as? [[String: Any]]
        else { return nil }

        let lines = rawLines.map { raw -> SystemStatusProps.StatusLine in
            let key = raw["key"] as? String ?? ""
            let value = raw["value"] as? String ?? ""
            let dotClass = raw["dotClass"] as? String ?? ""
            return SystemStatusProps.StatusLine(
                key: key,
                value: value,
                status: statusFromDotClass(dotClass)
            )
        }
        return SystemStatusProps(lines: lines)
    }

    // MARK: - Private helpers

    private static func statusFromDotClass(_ dotClass: String) -> String {
        if dotClass.contains("red") { return "error" }
        if dotClass.contains("amber") { return "stale" }
        return "online"
    }
}

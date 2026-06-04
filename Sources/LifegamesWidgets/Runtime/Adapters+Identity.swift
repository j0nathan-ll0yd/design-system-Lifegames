import Foundation

public extension Adapters {
    // MARK: - BioTerminal

    /// Adapts the `identity/bio-terminal*.json` wire envelope to `BioTerminalProps`.
    /// Wire shape: `{ "profile": { "terminalLines": [{ "type": String, "text": String? }] } }`
    /// Returns nil only if the outer JSON is not a dictionary; missing/empty `terminalLines`
    /// produces a valid Props with an empty lines array (e.g. skeleton/empty fixtures).
    static func bioTerminal(fromFixture data: Data) -> BioTerminalProps? {
        guard
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let profile = json["profile"] as? [String: Any]
        else { return nil }
        let rawLines = profile["terminalLines"] as? [[String: Any]] ?? []
        let lines = rawLines.map { raw in
            BioTerminalProps.TerminalLine(
                type: raw["type"] as? String ?? "output",
                text: raw["text"] as? String
            )
        }
        return BioTerminalProps(lines: lines)
    }

    // MARK: - ComingSoon

    /// Adapts the `identity/coming-soon*.json` wire envelope to `ComingSoonProps`.
    /// Wire shape: `{}` (all current fixtures are empty placeholders) OR a fully populated object.
    /// When the fixture is empty, returns a placeholder Props so the view renders something
    /// meaningful rather than silently failing.
    static func comingSoon(fromFixture data: Data) -> ComingSoonProps? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }
        // Fully-populated wire shape (future fixtures may use this):
        // { "operative": "...", "callsign": "...", "missionType": "...",
        //   "eta": "...", "briefing": "...", "objectives": [{text, completed}] }
        if let operative = json["operative"] as? String {
            let objectives = (json["objectives"] as? [[String: Any]] ?? []).map { obj in
                ComingSoonProps.Objective(
                    text: obj["text"] as? String ?? "",
                    completed: obj["completed"] as? Bool ?? false
                )
            }
            return ComingSoonProps(
                operative: operative,
                callsign: json["callsign"] as? String ?? "",
                missionType: json["missionType"] as? String ?? "",
                eta: json["eta"] as? String ?? "",
                briefing: json["briefing"] as? String ?? "",
                objectives: objectives
            )
        }
        // Empty fixture `{}` — return a placeholder so the view renders the widget chrome.
        return ComingSoonProps(
            operative: "—",
            callsign: "—",
            missionType: "—",
            eta: "—",
            briefing: "—",
            objectives: []
        )
    }

    // MARK: - IdentityCard

    /// Adapts the `identity/identity-card*.json` wire envelope to `IdentityCardProps`.
    /// Wire shape: `{ "profile": { "name": String, "title": String, "bio": String,
    ///   "github"?: String, "linkedin"?: String, "tagline"?: String } }`
    /// Returns nil only if the outer JSON is not a dictionary.
    static func identityCard(fromFixture data: Data) -> IdentityCardProps? {
        guard
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let profile = json["profile"] as? [String: Any]
        else { return nil }
        return IdentityCardProps(
            name: profile["name"] as? String ?? "",
            title: profile["title"] as? String ?? "",
            bio: profile["bio"] as? String ?? "",
            tagline: profile["tagline"] as? String ?? "",
            githubUrl: profile["github"] as? String ?? "",
            linkedinUrl: profile["linkedin"] as? String ?? ""
        )
    }
}

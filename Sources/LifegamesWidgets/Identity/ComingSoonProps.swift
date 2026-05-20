import Foundation

public struct ComingSoonProps: Hashable, Codable, Sendable {
    public let operative: String
    public let callsign: String
    public let missionType: String
    public let eta: String
    public let briefing: String
    public let objectives: [Objective]

    public init(
        operative: String, callsign: String,
        missionType: String, eta: String,
        briefing: String, objectives: [Objective]
    ) {
        self.operative = operative
        self.callsign = callsign
        self.missionType = missionType
        self.eta = eta
        self.briefing = briefing
        self.objectives = objectives
    }

    public struct Objective: Hashable, Codable, Sendable {
        public let text: String
        public let completed: Bool

        public init(text: String, completed: Bool) {
            self.text = text
            self.completed = completed
        }
    }
}

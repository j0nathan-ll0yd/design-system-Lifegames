import Foundation

public struct DndOverlayProps: Hashable, Codable, Sendable {
    public let isActive: Bool
    public let currentTime: String
    public let timeZone: String

    public init(isActive: Bool, currentTime: String = "", timeZone: String = "Pacific Standard Time") {
        self.isActive = isActive
        self.currentTime = currentTime
        self.timeZone = timeZone
    }
}

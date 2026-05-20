import Foundation

public struct FocusOverlayProps: Hashable, Codable, Sendable {
    public let isActive: Bool
    public let currentTime: String
    public let timeZone: String
    public let shiftStart: String
    public let shiftEnd: String

    public init(
        isActive: Bool, currentTime: String = "",
        timeZone: String = "Pacific Standard Time",
        shiftStart: String = "07:00", shiftEnd: String = "15:00"
    ) {
        self.isActive = isActive
        self.currentTime = currentTime
        self.timeZone = timeZone
        self.shiftStart = shiftStart
        self.shiftEnd = shiftEnd
    }
}

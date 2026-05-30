import Foundation

public struct SyncStatusProps: Equatable, Codable, Sendable {
    public static let syncedRecentWindow: TimeInterval = 5 * 60

    public enum Status: String, Codable, Sendable, CaseIterable {
        case idle, syncing, syncedRecent, needsSetup, authRequired, error
    }

    public let status: Status
    public let lastSyncDate: Date?
    public let referenceDate: Date
    public let errorMessage: String?
    public let primaryActionLabel: String

    public init(
        status: Status,
        lastSyncDate: Date?,
        referenceDate: Date = Date(),
        errorMessage: String? = nil,
        primaryActionLabel: String
    ) {
        self.status = status
        self.lastSyncDate = lastSyncDate
        self.referenceDate = referenceDate
        self.errorMessage = errorMessage
        self.primaryActionLabel = primaryActionLabel
    }
}

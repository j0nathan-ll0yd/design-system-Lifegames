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

public extension SyncStatusProps {
    static let previewIdle = SyncStatusProps(
        status: .idle,
        lastSyncDate: Date(timeIntervalSinceReferenceDate: 760_000_000),
        referenceDate: Date(timeIntervalSinceReferenceDate: 760_003_600),
        primaryActionLabel: "SYNC"
    )

    static let previewSyncing = SyncStatusProps(
        status: .syncing,
        lastSyncDate: Date(timeIntervalSinceReferenceDate: 760_003_580),
        referenceDate: Date(timeIntervalSinceReferenceDate: 760_003_600),
        primaryActionLabel: "SYNCING…"
    )

    static let previewSyncedRecent = SyncStatusProps(
        status: .syncedRecent,
        lastSyncDate: Date(timeIntervalSinceReferenceDate: 760_003_480),
        referenceDate: Date(timeIntervalSinceReferenceDate: 760_003_600),
        primaryActionLabel: "SYNC"
    )

    static let previewNeedsSetup = SyncStatusProps(
        status: .needsSetup,
        lastSyncDate: nil,
        referenceDate: Date(timeIntervalSinceReferenceDate: 760_003_600),
        primaryActionLabel: "OPEN IPHONE"
    )

    static let previewAuthRequired = SyncStatusProps(
        status: .authRequired,
        lastSyncDate: nil,
        referenceDate: Date(timeIntervalSinceReferenceDate: 760_003_600),
        primaryActionLabel: "AUTHORIZE"
    )

    static let previewError = SyncStatusProps(
        status: .error,
        lastSyncDate: Date(timeIntervalSinceReferenceDate: 760_000_000),
        referenceDate: Date(timeIntervalSinceReferenceDate: 760_003_600),
        errorMessage: "Network timeout",
        primaryActionLabel: "RETRY"
    )
}

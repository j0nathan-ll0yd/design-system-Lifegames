import Foundation

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

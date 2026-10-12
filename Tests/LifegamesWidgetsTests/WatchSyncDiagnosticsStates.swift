import Foundation
import LifegamesWidgetsWatch

/// The props behind every `WatchSyncDiagnosticsSnapshotTests` image, shared with
/// `WatchSyncDiagnosticsBehaviorTests` so each behavioral assertion holds the exact imaged state.
/// Dates are fixed offsets from one reference, so relative-time text is deterministic.
enum WatchSyncDiagnosticsStates {
    static let reference = Date(timeIntervalSinceReferenceDate: 760_003_600)

    static let idleConfigured = SyncStatusProps(
        status: .idle,
        lastSyncDate: reference.addingTimeInterval(-3600),
        referenceDate: reference,
        primaryActionLabel: "SYNC"
    )
    static let syncing = SyncStatusProps(
        status: .syncing,
        lastSyncDate: reference.addingTimeInterval(-20),
        referenceDate: reference,
        primaryActionLabel: "SYNCING…"
    )
    static let syncedRecent = SyncStatusProps(
        status: .syncedRecent,
        lastSyncDate: reference.addingTimeInterval(-120),
        referenceDate: reference,
        primaryActionLabel: "SYNC"
    )
    static let needsSetup = SyncStatusProps(
        status: .needsSetup,
        lastSyncDate: nil,
        referenceDate: reference,
        primaryActionLabel: "OPEN IPHONE"
    )
    static let authRequired = SyncStatusProps(
        status: .authRequired,
        lastSyncDate: nil,
        referenceDate: reference,
        primaryActionLabel: "AUTHORIZE"
    )
    static let error = SyncStatusProps(
        status: .error,
        lastSyncDate: reference.addingTimeInterval(-3600),
        referenceDate: reference,
        errorMessage: "Network timeout",
        primaryActionLabel: "RETRY"
    )
}

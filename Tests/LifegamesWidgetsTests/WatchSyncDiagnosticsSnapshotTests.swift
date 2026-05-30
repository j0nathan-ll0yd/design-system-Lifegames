#if canImport(UIKit)
import LifegamesTokens
import LifegamesWidgetsWatch
import SnapshotTesting
import SwiftUI
import Testing

/// Snapshot device choice (Key Decision §8 / Plan v3):
/// `swift-snapshot-testing` 1.17 does NOT ship `.appleWatchSeries*` configs, so we fall
/// back to fixed sizes — `.fixed(width: 198, height: 242)` for 45mm and
/// `.fixed(width: 176, height: 215)` for 41mm. These are intentionally different from
/// the screenshot-capture device (Apple Watch Series 11 46mm) — see Key Decision §9.
///
/// Font-size soft check (Critic §13): if the 41mm snapshots show truncation of the
/// "N events" header at the scale floor, downgrade to `Font.Tokens.caption()` in a
/// fast-follow commit.
@Suite("Watch Sync + Diagnostics Snapshots")
@MainActor
struct WatchSyncDiagnosticsSnapshotTests {
    private let layout45mm: SwiftUISnapshotLayout = .fixed(width: 198, height: 242)
    private let layout41mm: SwiftUISnapshotLayout = .fixed(width: 176, height: 215)

    private func wrap<V: View>(_ view: V) -> some View {
        view
            .background(LGColor.surfaceBase)
            .preferredColorScheme(.dark)
    }

    // MARK: - SyncStatusView (45mm)

    @Test func testSyncStatus_idleConfigured_45mm() {
        let props = SyncStatusProps(
            status: .idle,
            lastSyncDate: Date(timeIntervalSinceReferenceDate: 760_000_000),
            referenceDate: Date(timeIntervalSinceReferenceDate: 760_003_600),
            primaryActionLabel: "SYNC"
        )
        assertSnapshot(
            of: wrap(SyncStatusView(props: props, onPrimaryTap: {})),
            as: .image(layout: layout45mm)
        )
    }

    @Test func testSyncStatus_syncing_45mm() {
        let props = SyncStatusProps(
            status: .syncing,
            lastSyncDate: Date(timeIntervalSinceReferenceDate: 760_003_580),
            referenceDate: Date(timeIntervalSinceReferenceDate: 760_003_600),
            primaryActionLabel: "SYNCING…"
        )
        assertSnapshot(
            of: wrap(SyncStatusView(props: props, onPrimaryTap: {})),
            as: .image(layout: layout45mm)
        )
    }

    @Test func testSyncStatus_syncedRecent_45mm() {
        let reference = Date(timeIntervalSinceReferenceDate: 760_003_600)
        let props = SyncStatusProps(
            status: .syncedRecent,
            lastSyncDate: reference.addingTimeInterval(-120),
            referenceDate: reference,
            primaryActionLabel: "SYNC"
        )
        assertSnapshot(
            of: wrap(SyncStatusView(props: props, onPrimaryTap: {})),
            as: .image(layout: layout45mm)
        )
    }

    @Test func testSyncStatus_needsSetup_45mm() {
        let props = SyncStatusProps(
            status: .needsSetup,
            lastSyncDate: nil,
            referenceDate: Date(timeIntervalSinceReferenceDate: 760_003_600),
            primaryActionLabel: "OPEN IPHONE"
        )
        assertSnapshot(
            of: wrap(SyncStatusView(props: props, onPrimaryTap: {})),
            as: .image(layout: layout45mm)
        )
    }

    @Test func testSyncStatus_authRequired_45mm() {
        let props = SyncStatusProps(
            status: .authRequired,
            lastSyncDate: nil,
            referenceDate: Date(timeIntervalSinceReferenceDate: 760_003_600),
            primaryActionLabel: "AUTHORIZE"
        )
        assertSnapshot(
            of: wrap(SyncStatusView(props: props, onPrimaryTap: {})),
            as: .image(layout: layout45mm)
        )
    }

    @Test func testSyncStatus_error_45mm() {
        let props = SyncStatusProps(
            status: .error,
            lastSyncDate: Date(timeIntervalSinceReferenceDate: 760_000_000),
            referenceDate: Date(timeIntervalSinceReferenceDate: 760_003_600),
            errorMessage: "Network timeout",
            primaryActionLabel: "RETRY"
        )
        assertSnapshot(
            of: wrap(SyncStatusView(props: props, onPrimaryTap: {})),
            as: .image(layout: layout45mm)
        )
    }

    @Test func testSyncStatus_syncing_41mm() {
        let props = SyncStatusProps(
            status: .syncing,
            lastSyncDate: Date(timeIntervalSinceReferenceDate: 760_003_580),
            referenceDate: Date(timeIntervalSinceReferenceDate: 760_003_600),
            primaryActionLabel: "SYNCING…"
        )
        assertSnapshot(
            of: wrap(SyncStatusView(props: props, onPrimaryTap: {})),
            as: .image(layout: layout41mm)
        )
    }

    // MARK: - DiagnosticsMonitorView (45mm)

    @Test func testDiagnostics_empty_45mm() {
        assertSnapshot(
            of: wrap(DiagnosticsMonitorView(
                props: .previewEmpty,
                onClearTap: {},
                onTransferTap: {}
            )),
            as: .image(layout: layout45mm)
        )
    }

    @Test func testDiagnostics_populatedSmall_45mm() {
        assertSnapshot(
            of: wrap(DiagnosticsMonitorView(
                props: .previewPopulated,
                onClearTap: {},
                onTransferTap: {}
            )),
            as: .image(layout: layout45mm)
        )
    }

    @Test func testDiagnostics_populatedMany_45mm() {
        assertSnapshot(
            of: wrap(DiagnosticsMonitorView(
                props: .previewMany,
                onClearTap: {},
                onTransferTap: {}
            )),
            as: .image(layout: layout45mm)
        )
    }

    @Test func testDiagnostics_transferring_45mm() {
        assertSnapshot(
            of: wrap(DiagnosticsMonitorView(
                props: .previewTransferring,
                onClearTap: {},
                onTransferTap: {}
            )),
            as: .image(layout: layout45mm)
        )
    }

    @Test func testDiagnostics_populatedSmall_41mm() {
        assertSnapshot(
            of: wrap(DiagnosticsMonitorView(
                props: .previewPopulated,
                onClearTap: {},
                onTransferTap: {}
            )),
            as: .image(layout: layout41mm)
        )
    }
}
#endif

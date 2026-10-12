import LifegamesWidgetsWatch
import SwiftUI
import Testing
import ViewInspector

/// Behavioral assertions for every `WatchSyncDiagnosticsSnapshotTests` state. The 41mm images
/// re-render a 45mm state at a smaller size, so the same assertions cover both sizes.
@Suite("Watch sync and diagnostics states — behavioral")
@MainActor
struct WatchSyncDiagnosticsBehaviorTests {
    private typealias States = WatchSyncDiagnosticsStates

    // MARK: - SyncStatusView

    @Test(arguments: [
        // Status pill, relative last-sync time, error line (error only), action label.
        (States.idleConfigured, ["READY", "1h ago", "SYNC"]),
        (States.syncing, ["SYNCING…", "20s ago", "SYNCING…"]),
        (States.syncedRecent, ["SYNCED", "2m ago", "SYNC"]),
        (States.needsSetup, ["NEEDS SETUP", "Never synced", "OPEN IPHONE"]),
        (States.authRequired, ["AUTH REQUIRED", "Never synced", "AUTHORIZE"]),
        (States.error, ["SYNC ERROR", "1h ago", "Network timeout", "RETRY"]),
    ])
    func syncStatusShowsPillRelativeTimeAndAction(props: SyncStatusProps, expected: [String]) throws {
        let view = SyncStatusView(props: props, onPrimaryTap: {})
        #expect(try renderedText(view) == expected)
        // The hero symbol announces the same status the pill shows.
        let hero = try view.inspect().find(ViewType.Image.self)
        #expect(try hero.accessibilityLabel().string() == "Sync status: \(try #require(expected.first))")
    }

    @Test(arguments: [
        (States.idleConfigured, false),
        (States.syncing, false),
        (States.syncedRecent, false),
        (States.needsSetup, true),
        (States.authRequired, false),
        (States.error, false),
    ])
    func syncPrimaryActionIsDisabledOnlyWhenSetupIsNeeded(props: SyncStatusProps, disabled: Bool) throws {
        let button = try SyncStatusView(props: props, onPrimaryTap: {}).inspect().find(ViewType.Button.self)
        #expect(button.isDisabled() == disabled)
    }

    @Test func syncPrimaryActionCallsBack() throws {
        var taps = 0
        let view = SyncStatusView(props: States.error, onPrimaryTap: { taps += 1 })
        try view.inspect().find(ViewType.Button.self).tap()
        #expect(taps == 1)
    }

    // MARK: - DiagnosticsMonitorView

    @Test func diagnosticsEmptyShowsZeroCountsAndNoLogRows() throws {
        let text = try renderedText(diagnostics(.previewEmpty))
        #expect(text == [
            "SYN", "0", "BG", "0", "HLT", "0", "LOC", "0", "LIF", "0", "CON", "0",
            "0 events", "Zero KB", "RECENT ACTIVITY",
        ])
    }

    @Test(arguments: [DiagnosticsMonitorProps.previewPopulated, .previewTransferring])
    func diagnosticsPopulatedShowsCountsTotalSizeAndEveryEntry(props: DiagnosticsMonitorProps) throws {
        let text = try renderedText(diagnostics(props))
        #expect(Array(text.prefix(15)) == [
            "SYN", "48", "BG", "22", "HLT", "31", "LOC", "18", "LIF", "14", "CON", "9",
            "142 events", "25 KB", "RECENT ACTIVITY",
        ])
        #expect(props.entries.count == 6)
        for entry in props.entries {
            #expect(text.contains(entry.message))
        }
    }

    @Test func diagnosticsManyCapsTheLogAtTwentyFiveRows() throws {
        let props = DiagnosticsMonitorProps.previewMany
        #expect(props.entries.count > 25, "the preview must exceed the cap or this test proves nothing")
        let text = try renderedText(diagnostics(props))
        #expect(text.contains("320 events"))
        #expect(text.contains("Event 25"))
        #expect(!text.contains("Event 26"))
    }

    @Test(arguments: [
        (DiagnosticsMonitorProps.previewPopulated, false),
        (DiagnosticsMonitorProps.previewTransferring, true),
    ])
    func diagnosticsTransferButtonSpinsAndLocksWhileUploading(
        props: DiagnosticsMonitorProps, uploading: Bool
    ) throws {
        // Two buttons: clear, then transfer. Only an upload in flight swaps the transfer icon
        // for a spinner and disables the button.
        let buttons = try diagnostics(props).inspect().findAll(ViewType.Button.self)
        #expect(buttons.count == 2)
        let transfer = try #require(buttons.last)
        #expect(try transfer.accessibilityLabel().string()
            == (uploading ? "Transfer in progress" : "Transfer log to iPhone"))
        #expect(transfer.isDisabled() == uploading)
        #expect(((try? transfer.find(ViewType.ProgressView.self)) != nil) == uploading)
        #expect(buttons[0].isDisabled() == false)
    }

    private func diagnostics(_ props: DiagnosticsMonitorProps) -> DiagnosticsMonitorView {
        DiagnosticsMonitorView(props: props, onClearTap: {}, onTransferTap: {})
    }
}

import LifegamesWidgetsWatch
import SwiftUI
import Testing
import ViewInspector

/// Behavioral assertions for `DiagnosticsMonitorView` at accessibility text sizes. At AX3 the
/// category codes broke mid-code ("SY / N"), log messages were cut off ("WCSes / sion / activa…")
/// and the log size became a letter-wide column ("4 / K / B").
@Suite("Diagnostics monitor — accessibility text sizes")
@MainActor
struct DiagnosticsAccessibilityLayoutTests {
    private static let props = DiagnosticsMonitorProps.previewPopulated
    private static let codes = ["SYN", "BG", "HLT", "LOC", "LIF", "CON"]

    private func monitor(_ size: DynamicTypeSize) -> some View {
        DiagnosticsMonitorView(props: Self.props, onClearTap: {}, onTransferTap: {})
            .environment(\.dynamicTypeSize, size)
    }

    /// `lineLimit()` throws when no limit is set; both mean "uncapped".
    private func lineLimit(_ text: InspectableView<ViewType.Text>) -> Int? {
        (try? text.lineLimit()) ?? nil
    }

    @Test(arguments: [DynamicTypeSize.large, .accessibility3])
    func categoryCodesNeverBreak(size: DynamicTypeSize) throws {
        for code in Self.codes {
            let text = try monitor(size).inspect().find(text: code)
            #expect(try text.fixedSize() == (horizontal: true, vertical: true), "\(code)")
        }
    }

    @Test func logMessagesKeepTheirThreeLineCapAtDefaultSize() throws {
        for entry in Self.props.entries {
            let message = try monitor(.large).inspect().find(text: entry.message)
            #expect(lineLimit(message) == 3, "\(entry.message)")
        }
    }

    @Test func logMessagesWrapInFullAtAccessibilitySizes() throws {
        for entry in Self.props.entries {
            let message = try monitor(.accessibility3).inspect().find(text: entry.message)
            #expect(lineLimit(message) == nil, "\(entry.message)")
            #expect(try message.fixedSize() == (horizontal: false, vertical: true), "\(entry.message)")
        }
    }

    @Test(arguments: [(DynamicTypeSize.large, true), (.accessibility3, false)])
    func logSizeSharesTheButtonRowOnlyBelowAccessibilitySizes(size: DynamicTypeSize, sharesRow: Bool) throws {
        let label = try monitor(size).inspect().find(viewWithAccessibilityLabel: "Log size")
        let row = try? label.find(ViewType.HStack.self, relation: .parent)
        #expect(((try? row?.find(ViewType.Button.self)) != nil) == sharesRow)
    }
}

import SwiftUI
import ViewInspector

/// Every `Text` the view tree renders, in tree order, read through ViewInspector. This is the
/// SwiftUI analogue of reading DOM text: a behavioral assertion that does not depend on pixels,
/// fonts or the simulator runtime, so it runs under `swift test` on the macOS host too.
@MainActor
func renderedText<V: View>(_ view: V) throws -> [String] {
    try view.inspect().findAll(ViewType.Text.self).map { try $0.string() }
}

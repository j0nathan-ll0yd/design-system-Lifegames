import SwiftUI
import Testing
import ViewInspector
@testable import LifegamesComponents

/// Behavioral pair for `SectionHeaderSnapshotTests.sectionHeaderDefault`.
@Suite("SectionHeader — behavioral")
@MainActor
struct SectionHeaderBehaviorTests {
    @Test func rendersTheTitleVerbatimFollowedByADivider() throws {
        let header = try SectionHeader(title: "VITALS").inspect()
        #expect(try header.findAll(ViewType.Text.self).map { try $0.string() } == ["VITALS"])
        _ = try header.find(ViewType.Divider.self)
    }
}

import SwiftUI
import Testing
import ViewInspector
@testable import LifegamesComponents

/// A missing resting heart rate or stand value renders the no-reading mark, never 0
/// (atlas decision 0160 F1), and VoiceOver reads "No reading" for it.
@Suite("DatastreamHomeGrid — missing values")
@MainActor
struct DatastreamHomeMissingValueTests {
    private func data(restingHR: Int?, standValue: String?) -> DatastreamHomeData {
        var data = DatastreamHomeData.sample
        data.restingHR = restingHR
        data.standValue = standValue
        return data
    }

    private func texts(_ data: DatastreamHomeData) throws -> [InspectableView<ViewType.Text>] {
        try DatastreamHomeGrid(data: data).inspect().findAll(ViewType.Text.self)
    }

    @Test func missingRestingHRAndStandRenderTheLabelledMark() throws {
        let all = try texts(data(restingHR: nil, standValue: nil))
        let strings = try all.map { try $0.string() }
        #expect(strings.contains("\(NoReading.mark) bpm"))
        #expect(!strings.contains("0 bpm"))
        #expect(strings.contains(NoReading.mark))
        let labelled = try all.filter { try [NoReading.mark, "\(NoReading.mark) bpm"].contains($0.string()) }
        #expect(labelled.count == 2)
        for text in labelled {
            #expect(try text.accessibilityLabel().string() == "No reading")
        }
    }

    @Test func measuredValuesRenderAndReadAsThemselves() throws {
        let all = try texts(data(restingHR: 58, standValue: "11"))
        let strings = try all.map { try $0.string() }
        #expect(strings.contains("58 bpm"))
        #expect(strings.contains("11"))
        #expect(!strings.contains(NoReading.mark))
        for text in try all.filter({ try ["58 bpm", "11"].contains($0.string()) }) {
            #expect((try? text.accessibilityLabel().string()) != "No reading")
        }
    }
}

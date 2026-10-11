import SwiftUI
import Testing
import ViewInspector
@testable import LifegamesComponents

// covers: widget-contract#A Swift health widget renders a missing measurement as the no-reading mark
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

    @Test func missingStepsMoveAndExerciseRenderTheLabelledMarkAndHideTheBadge() throws {
        var data = DatastreamHomeData.sample
        data.steps = nil
        data.moveValue = nil
        data.moveProgress = 0
        data.exerciseValue = nil
        data.exerciseProgress = 0
        let all = try texts(data)
        let strings = try all.map { try $0.string() }
        #expect(!strings.contains("0"))
        #expect(!strings.contains { $0.hasSuffix("% MOVE") })
        #expect(DatastreamHomeGrid.moveBadge(data) == nil)
        // Steps, move and exercise; resting HR (58) and stand ("11/12") are measured.
        let marks = all.filter { (try? $0.string()) == NoReading.mark }
        #expect(marks.count == 3)
        for mark in marks {
            #expect(try mark.accessibilityLabel().string() == "No reading")
        }
    }

    @Test func measuredZeroStepsMoveAndExerciseStayZero() throws {
        var data = DatastreamHomeData.sample
        data.steps = 0
        data.moveValue = "0"
        data.moveProgress = 0
        data.exerciseValue = "0"
        data.exerciseProgress = 0
        let strings = try texts(data).map { try $0.string() }
        #expect(strings.filter { $0 == "0" }.count == 3)
        #expect(!strings.contains(NoReading.mark))
        #expect(DatastreamHomeGrid.moveBadge(data) == "0% MOVE")
        #expect(DatastreamHomeGrid.stepsText(8247) == 8247.formatted())
    }
}

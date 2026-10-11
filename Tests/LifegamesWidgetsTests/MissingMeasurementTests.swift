import Foundation
import LifegamesComponents
import SwiftUI
import Testing
import ViewInspector
@testable import LifegamesWidgets

// covers: widget-contract#A Swift health widget renders a missing measurement as the no-reading mark
/// A missing measurement renders as missing, never as 0 (atlas decision 0160 F1). The Swift
/// props carry a missing value as nil; each view renders `NoReading.mark` for it, and VoiceOver
/// reads the shared "No reading" copy. A measured 0 still renders as 0 wherever 0 is a reading.
@Suite("Missing measurements render the no-reading mark")
@MainActor
struct MissingMeasurementTests {
    private static let noReading = "No reading"

    /// Every Text that shows the mark, so a test can assert its count and its VoiceOver label.
    private func marks(in view: some View) throws -> [InspectableView<ViewType.Text>] {
        try view.inspect().findAll(ViewType.Text.self).filter { try $0.string() == NoReading.mark }
    }

    private func expectLabelled(_ marks: [InspectableView<ViewType.Text>]) throws {
        for mark in marks {
            #expect(try mark.accessibilityLabel().string() == Self.noReading)
        }
    }

    // MARK: - NightSummary

    private func nightSummary(score: Int?) -> NightSummaryProps {
        NightSummaryProps.from(sleepScore: score, coreSeconds: 12600, deepSeconds: 4320, remSeconds: 6480, awakeSeconds: 2160)
    }

    @Test func nightSummaryMissingScoreRendersTheMarkNotZero() throws {
        let view = NightSummaryView(props: nightSummary(score: nil))
        let text = try renderedText(view)
        #expect(Array(text.prefix(5)) == ["NIGHT SUMMARY", "last night", "6h 30m", "Score", NoReading.mark])
        #expect(!text.contains("0"))
        let found = try marks(in: view)
        #expect(found.count == 1)
        try expectLabelled(found)
    }

    @Test func nightSummaryScoreBarIsEmptyWithoutAScore() {
        #expect(NightSummaryPopulatedView.scoreFraction(nil) == 0)
        #expect(NightSummaryPopulatedView.scoreFraction(82) == 0.82)
        #expect(NightSummaryPopulatedView.scoreFraction(140) == 1)
    }

    @Test func nightSummaryMeasuredZeroScoreStaysZero() throws {
        #expect(NightSummaryPopulatedView.scoreText(0) == "0")
        let text = try renderedText(NightSummaryView(props: nightSummary(score: 0)))
        #expect(text[4] == "0")
        #expect(!text.contains(NoReading.mark))
    }

    @Test func nightSummaryAdapterKeepsAMissingScoreMissing() throws {
        let json = #"{"health":{"sleepDurationFormatted":"7h 18m","sleepPhaseFormatted":{},"derived":{}}}"#
        let props = try #require(Adapters.nightSummary(fromFixture: Data(json.utf8)))
        #expect(props.sleepScore == nil)
    }

    @Test func nightSummaryPropsDecodeWithoutAScore() throws {
        let json = #"{"duration":"7h","deepFormatted":"1h","remFormatted":"2h","coreFormatted":"3h","awakeFormatted":"1h","deepPct":17,"remPct":33}"#
        let props = try JSONDecoder().decode(NightSummaryProps.self, from: Data(json.utf8))
        #expect(props.sleepScore == nil)
    }

    // MARK: - HeartRate

    @Test func heartRateMissingBpmAndHrvRenderTheMarkWithNoZone() throws {
        let props = HeartRateProps(bpm: nil, hrv: nil, zone: "")
        #expect(props.heartRateZone == nil)
        let view = HeartRateView(props: props, animateECG: false)
        let text = try renderedText(view)
        let zones: [HeartRateZone] = [.bradycardia, .restingZone, .normalZone, .fatBurn, .peakZone]
        for zone in zones {
            #expect(!text.contains(zone.name), "a missing heart rate must not render \(zone.name)")
        }
        #expect(!text.contains("0"))
        // bpm, zone badge and HRV, plus the three footer vitals (all missing here).
        let found = try marks(in: view)
        #expect(found.count == 6)
        try expectLabelled(found)
    }

    @Test func heartRateZeroBpmIsNoReading() {
        // Parity with the web `formatPositiveVital`: a heart rate of 0 is no reading.
        let props = HeartRateProps(bpm: 0, hrv: 0, zone: "")
        #expect(props.bpmReading == nil)
        #expect(props.heartRateZone == nil)
        #expect(HeartRatePopulatedView.bpmText(props) == NoReading.mark)
        #expect(HeartRatePopulatedView.zoneText(props) == NoReading.mark)
        // HRV: any value is a reading (web `formatHrv`), so a measured 0 stays 0.
        #expect(HeartRatePopulatedView.hrvText(0) == "0")
        #expect(HeartRatePopulatedView.hrvText(nil) == NoReading.mark)
    }

    @Test func heartRateZeroBpmRendersTheMarkWithNoZone() throws {
        let view = HeartRateView(props: HeartRateProps(bpm: 0, hrv: nil, zone: "", restingHeartRate: 58), animateECG: false)
        let text = try renderedText(view)
        // bpm, zone badge, HRV, then the footer's respiratory rate and temperature; RHR is 58.
        #expect(Array(text.prefix(8)) == ["HEART RATE", "live", NoReading.mark, "BPM", NoReading.mark, "HRV", NoReading.mark, "ms"])
        #expect(text.contains("58"))
        let zones: [HeartRateZone] = [.bradycardia, .restingZone, .normalZone, .fatBurn, .peakZone]
        for zone in zones {
            #expect(!text.contains(zone.name), "0 bpm must not render \(zone.name)")
        }
        let found = try marks(in: view)
        #expect(found.count == 5)
        try expectLabelled(found)
    }

    @Test func heartRateReadingCarriesNoNoReadingLabel() throws {
        let props = HeartRateProps(bpm: 72, hrv: 35, zone: "")
        #expect(HeartRatePopulatedView.bpmText(props) == "72")
        #expect(HeartRatePopulatedView.zoneText(props) == HeartRateZone.normalZone.name)
        let values = try HeartRateView(props: props, animateECG: false).inspect()
            .findAll(ViewType.Text.self).filter { ["72", "35"].contains(try $0.string()) }
        #expect(values.count == 2)
        for value in values {
            #expect((try? value.accessibilityLabel().string()) != Self.noReading)
        }
    }

    @Test func heartRateAdapterKeepsMissingQuantitiesMissing() {
        let props = Adapters.adaptHeartRate(from: ["quantities": [String: [String: Any]]()])
        #expect(props.bpm == nil)
        #expect(props.hrv == nil)
        let measured = Adapters.adaptHeartRate(from: ["quantities": ["heartRate": ["value": 61.6], "hrvSDNN": ["value": 0.0]]])
        #expect(measured.bpm == 62)
        #expect(measured.hrv == 0)
    }

    // MARK: - MovementRings

    private func movement(standHr: Double?, daylightMin: Double?, solar: MovementRingsProps.Solar? = nil) -> MovementRingsProps {
        MovementRingsProps(
            moveKcal: 380, exerciseMin: 32, standHr: standHr, steps: 8421,
            distanceMeters: 6200, flights: 14, daylightMin: daylightMin, solar: solar
        )
    }

    @Test func movementMissingStandAndDaylightRenderTheMark() throws {
        let view = MovementRingsView(props: movement(standHr: nil, daylightMin: nil))
        let text = try renderedText(view)
        // The stand swatch reads "—" then "/12"; never "0/12".
        #expect(text.contains("/12"))
        #expect(!text.contains("0/12"))
        #expect(!text.contains("0"))
        // Stand value and daylight minutes; with no solar the sun track (and its times) is hidden.
        let found = try marks(in: view)
        #expect(found.count == 2)
        try expectLabelled(found)
    }

    @Test func movementWithoutSolarHidesTheSunTrack() throws {
        let view = MovementRingsView(props: movement(standHr: 9, daylightMin: 48))
        let text = try renderedText(view)
        // No invented times, no marks in their place, and no track at all.
        #expect(!text.contains("06:30"))
        #expect(!text.contains("20:15"))
        #expect(!text.contains(NoReading.mark))
        #expect(throws: (any Error).self) {
            try view.inspect().find(viewWithAccessibilityIdentifier: SunArcFooterView.sunTrackIdentifier)
        }
        // The daylight-minutes line stays.
        #expect(text.contains("48"))
        #expect(text.contains { $0.contains("min in daylight today") })
    }

    @Test func movementWithSolarShowsTheTrackAndBothTimes() throws {
        let solar = MovementRingsProps.Solar(sunriseHHmm: "06:41", sunsetHHmm: "19:02", currentProgressPct: 40)
        let view = MovementRingsView(props: movement(standHr: 9, daylightMin: 48, solar: solar))
        let track = try view.inspect().find(viewWithAccessibilityIdentifier: SunArcFooterView.sunTrackIdentifier)
        let trackText = try track.findAll(ViewType.Text.self).map { try $0.string() }
        #expect(trackText == ["06:41", "19:02"])
        let text = try renderedText(view)
        #expect(!text.contains(NoReading.mark))
        #expect(text.contains { $0.contains("min in daylight today") })
    }

    @Test func movementMeasuredZeroStaysZero() {
        #expect(MovementSwatch.valueText(0) == "0")
        #expect(MovementSwatch.valueText(nil) == NoReading.mark)
        #expect(SunArcFooterView.daylightText(0) == "0")
        #expect(SunArcFooterView.daylightText(nil) == NoReading.mark)
    }

    @Test func movementMissingDaylightNeverHitsTheGoal() {
        #expect(!SunArcFooterView.daylightHit(nil, goal: 0))
        #expect(SunArcFooterView.daylightHit(20, goal: 20))
        #expect(!SunArcFooterView.daylightHit(19, goal: 20))
    }

    private func counts(
        moveKcal: Double?, exerciseMin: Double?, steps: Int?, distanceMeters: Double?, flights: Int?
    ) -> MovementRingsProps {
        MovementRingsProps(
            moveKcal: moveKcal, exerciseMin: exerciseMin, standHr: 9, steps: steps,
            distanceMeters: distanceMeters, flights: flights, daylightMin: 48
        )
    }

    @Test func movementMissingCountsRenderTheLabelledMark() throws {
        let view = MovementRingsView(props: counts(moveKcal: nil, exerciseMin: nil, steps: nil, distanceMeters: nil, flights: nil))
        let text = try renderedText(view)
        // Steps, distance and flights chips, the move and exercise swatches, and the ring
        // centre: six marks. Stand (9) and daylight (48) are measured.
        let found = try marks(in: view)
        #expect(found.count == 6)
        try expectLabelled(found)
        #expect(!text.contains("0"))
        #expect(!text.contains("0%"))
        #expect(!text.contains("0.0"))
        #expect(!text.contains("0/500"))
        #expect(!text.contains("0/30"))
        #expect(text.contains("/500"))
        #expect(text.contains("/30"))
        #expect(text.contains("9"))
    }

    @Test func movementMeasuredZeroCountsStayZero() throws {
        let view = MovementRingsView(props: counts(moveKcal: 0, exerciseMin: 0, steps: 0, distanceMeters: 0, flights: 0))
        let text = try renderedText(view)
        #expect(try marks(in: view).isEmpty)
        // Ring centre, steps, distance, flights, then the move and exercise swatch values.
        #expect(text.contains("0%"))
        #expect(text.contains("0.0"))
        #expect(text.filter { $0 == "0" }.count == 4)
    }

    @Test func movementCountFormatters() {
        #expect(MovementRingsPopulatedView.stepsText(nil) == NoReading.mark)
        #expect(MovementRingsPopulatedView.stepsText(0) == "0")
        #expect(MovementRingsPopulatedView.distanceText(nil) == NoReading.mark)
        #expect(MovementRingsPopulatedView.distanceText(0) == "0.0")
        #expect(MovementRingsPopulatedView.distanceText(6249) == "6.2")
        #expect(NoReading.text(Int?.none) == NoReading.mark)
    }

    @Test func movementRingCentreIsTheMarkWithoutMoveAndCapsAtTheGoal() {
        // Web `centerText`: the mark without a move reading, else the percentage capped at 100%.
        #expect(ConcentricRingsView.centerText(moveKcal: nil, goalMoveKcal: 500) == NoReading.mark)
        #expect(ConcentricRingsView.centerText(moveKcal: 0, goalMoveKcal: 500) == "0%")
        #expect(ConcentricRingsView.centerText(moveKcal: 250, goalMoveKcal: 500) == "50%")
        #expect(ConcentricRingsView.centerText(moveKcal: 520, goalMoveKcal: 500) == "100%")
        #expect(ConcentricRingsView.centerText(moveKcal: 100, goalMoveKcal: 0) == "0%")
    }

    @Test func movementAdapterKeepsMissingCountsMissing() throws {
        let json = #"{"health":{"movement":{"standHr":4}}}"#
        let props = try #require(Adapters.movementRings(fromFixture: Data(json.utf8)))
        #expect(props.moveKcal == nil)
        #expect(props.exerciseMin == nil)
        #expect(props.steps == nil)
        #expect(props.distanceMeters == nil)
        #expect(props.flights == nil)
        #expect(props.standHr == 4)
        let zeros = #"{"health":{"movement":{"moveKcal":0,"exerciseMin":0,"steps":0,"distanceMeters":0,"flights":0}}}"#
        let measured = try #require(Adapters.movementRings(fromFixture: Data(zeros.utf8)))
        #expect(measured.moveKcal == 0)
        #expect(measured.exerciseMin == 0)
        #expect(measured.steps == 0)
        #expect(measured.distanceMeters == 0)
        #expect(measured.flights == 0)
    }

    @Test func movementAdapterKeepsMissingStandAndDaylightMissing() throws {
        let json = #"{"health":{"movement":{"moveKcal":300,"exerciseMin":20,"steps":5000}}}"#
        let props = try #require(Adapters.movementRings(fromFixture: Data(json.utf8)))
        #expect(props.standHr == nil)
        #expect(props.daylightMin == nil)
    }
}

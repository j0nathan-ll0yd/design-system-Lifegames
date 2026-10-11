import Foundation
import LifegamesComponents

// Swift twins of the web per-widget state rules (atlas decision 0160).
//
// The web owner is `packages/web/src/runtime/widget-rules.ts`, which builds on
// `resolveWidgetState` and `rendersData` in `packages/web/src/runtime/widget-state.ts`.
// Each twin here takes the same inputs and returns the same state, so a Swift
// consumer (the iOS Health tab) renders the card the web renders for the same
// data. `WidgetRulesTests` pins every twin to the web rule's known answers.

/// The web render-state union, case for case: the raw values are the web strings.
///
/// `WidgetState<T>` is the view-side state and has no `stale` case; both data states
/// (`live` and `stale`) map to `.populated` through ``widgetState(_:)``.
public enum WidgetRenderState: String, CaseIterable, Sendable {
    case live
    case stale
    case empty
    case unavailable
    case suppressed
    case loading

    /// True when the state renders data values (web `rendersData`).
    public var rendersData: Bool {
        self == .live || self == .stale
    }

    /// The compatibility mapper (web `resolveWidgetState`). An explicit non-data state
    /// always wins. An explicit data state with no data degrades to `empty`. No explicit
    /// state: data present is `live`, otherwise `empty`.
    public static func resolve(_ explicit: WidgetRenderState?, hasData: Bool) -> WidgetRenderState {
        if let explicit, !explicit.rendersData {
            return explicit
        }
        if !hasData {
            return .empty
        }
        return explicit ?? .live
    }

    /// The view state for this render state. `props` is built only for a data state.
    public func widgetState<T>(_ props: () -> T) -> WidgetState<T> {
        switch self {
        case .live, .stale: .populated(props())
        case .empty: .empty
        case .unavailable: .unavailable
        case .suppressed: .suppressed
        case .loading: .loading
        }
    }
}

/// The inputs of the web `heartRateState` rule, typed.
public struct HeartRateStateInput: Equatable, Sendable {
    /// The health export behind the card. Nil means no export (web `p.health == null`).
    public struct Health: Equatable, Sendable {
        /// `quantities.heartRate.value`, nil when the export carried none.
        public var heartRate: Double?
        /// `quantities.hrvSDNN.value`, nil when the export carried none.
        public var hrv: Double?
        /// How many quantities the export carries (web `Object.keys(quantities).length`),
        /// counting the heart rate and HRV themselves.
        public var quantityCount: Int
        /// True when the export reports the watch off the wrist or charging
        /// (web `isWatchPaused`: `watch.worn === false`).
        public var watchPaused: Bool

        public init(heartRate: Double?, hrv: Double?, quantityCount: Int, watchPaused: Bool = false) {
            self.heartRate = heartRate
            self.hrv = hrv
            self.quantityCount = quantityCount
            self.watchPaused = watchPaused
        }
    }

    /// The explicit render state (web `p.state`), nil when the caller passes none.
    public var state: WidgetRenderState?
    public var health: Health?

    public init(state: WidgetRenderState? = nil, health: Health?) {
        self.state = state
        self.health = health
    }
}

public enum WidgetRules {
    /// True for a finite number: the export carried this measurement (web `isReading`).
    static func isReading(_ value: Double?) -> Bool {
        value?.isFinite ?? false
    }

    /// HeartRate (web `heartRateState`). A paused watch keeps the data state. Otherwise a
    /// data state without a heart-rate reading is `unavailable` when the export carries
    /// other quantities, and `empty` when it carries none. A recorded 0 for both heart
    /// rate and HRV is `empty`.
    public static func heartRateState(_ input: HeartRateStateInput) -> WidgetRenderState {
        let state = WidgetRenderState.resolve(input.state, hasData: input.health != nil)
        guard state.rendersData, let health = input.health, !health.watchPaused else {
            return state
        }
        guard isReading(health.heartRate), let heartRate = health.heartRate else {
            // A readable export with no quantity at all is empty ("No heart rate data");
            // one with other readings but no heart rate cannot render its primary
            // measurement: unavailable.
            return health.quantityCount == 0 ? .empty : .unavailable
        }
        if heartRate == 0, !isReading(health.hrv) || health.hrv == 0 {
            return .empty
        }
        return state
    }

    /// HeartRate from the web props shape: `{state?, health?: {quantities?, watch?}}`.
    /// The same JSON the web rule reads, so a fixture or a web known answer decodes to the
    /// same input. A non-string or unknown `state` counts as absent; a non-number
    /// quantity value counts as no reading.
    public static func heartRateState(props: [String: Any]) -> WidgetRenderState {
        heartRateState(heartRateInput(props: props))
    }

    static func heartRateInput(props: [String: Any]) -> HeartRateStateInput {
        let explicit = (props["state"] as? String).flatMap(WidgetRenderState.init(rawValue:))
        guard let health = props["health"] as? [String: Any] else {
            return HeartRateStateInput(state: explicit, health: nil)
        }
        let quantities = health["quantities"] as? [String: Any] ?? [:]
        func value(_ key: String) -> Double? {
            guard let number = (quantities[key] as? [String: Any])?["value"] as? NSNumber, !isBoolean(number) else {
                return nil
            }
            return number.doubleValue
        }
        // Web `watch.worn === false`: only the JSON boolean false pauses, never a 0.
        let worn = (health["watch"] as? [String: Any])?["worn"] as? NSNumber
        return HeartRateStateInput(state: explicit, health: .init(
            heartRate: value("heartRate"),
            hrv: value("hrvSDNN"),
            quantityCount: quantities.count,
            watchPaused: worn.map { isBoolean($0) && !$0.boolValue } ?? false
        ))
    }

    /// JSON booleans and numbers both bridge to NSNumber; the web rule tells them apart.
    private static func isBoolean(_ number: NSNumber) -> Bool {
        CFGetTypeID(number) == CFBooleanGetTypeID()
    }
}

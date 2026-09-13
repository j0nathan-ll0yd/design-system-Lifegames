import Foundation

// MARK: - DatastreamHomeData

/// Presentational data bag for the Datastream home bento grid.
///
/// The app fills this from live features (HealthKit, Location, Books, Coffee TCA stores).
/// The gallery fills it with `DatastreamHomeData.sample`.
///
/// All fields are intentionally simple value types — no feature-layer or TCA types —
/// so this struct stays in `LifegamesComponents` without pulling in any app dependencies.
public struct DatastreamHomeData: Sendable {
    // MARK: - Activity rings

    /// Raw step count for today.
    public var steps: Int

    /// Move ring fill (0–1; may exceed 1 if goal surpassed).
    public var moveProgress: Double
    /// Move ring display value (e.g. "487").
    public var moveValue: String

    /// Exercise ring fill (0–1).
    public var exerciseProgress: Double
    /// Exercise ring display value (e.g. "45m").
    public var exerciseValue: String

    /// Stand ring fill (0–1).
    public var standProgress: Double
    /// Stand ring display value (e.g. "11h").
    public var standValue: String

    // MARK: - Heart rate

    /// Resting heart rate in BPM.
    public var restingHR: Int

    // MARK: - Caffeine

    /// Caffeine consumed today in milligrams.
    public var caffeineMg: Int
    /// Daily caffeine target in milligrams.
    public var caffeineTarget: Int
    /// Number of cups consumed today.
    public var cups: Int
    /// Name of the last beverage (e.g. "Espresso").
    public var lastBeverage: String

    // MARK: - Reading

    /// Remote URL for the current book's cover image. Nil when unknown.
    public var bookCoverURL: URL?
    /// Reading progress for the current book (0–1).
    public var bookProgress: Double

    // MARK: - Location

    public var latitude: Double
    public var longitude: Double
    /// Primary place name (e.g. "Blue Bottle Coffee").
    public var placeName: String
    /// Secondary location descriptor (e.g. "Ferry Building").
    public var placeSubtitle: String
    /// Status pill text (e.g. "Currently here · 34m").
    public var locationStatus: String

    // MARK: - Header

    /// Human-readable date shown in the screen header (e.g. "Thursday, 3 July").
    /// The app formats today's date; the gallery uses a fixed sample.
    public var dateLabel: String

    /// When the underlying data was last synced. When set, the header renders a live
    /// relative timestamp ("Updated 3 minutes ago"); when nil (gallery/previews), the
    /// header keeps the static "Updated just now".
    public var lastUpdated: Date?

    // MARK: - Init

    public init(
        steps: Int,
        moveProgress: Double, moveValue: String,
        exerciseProgress: Double, exerciseValue: String,
        standProgress: Double, standValue: String,
        restingHR: Int,
        caffeineMg: Int, caffeineTarget: Int, cups: Int, lastBeverage: String,
        bookCoverURL: URL?, bookProgress: Double,
        latitude: Double, longitude: Double,
        placeName: String, placeSubtitle: String, locationStatus: String,
        dateLabel: String = "Today",
        lastUpdated: Date? = nil
    ) {
        self.dateLabel = dateLabel
        self.lastUpdated = lastUpdated
        self.steps = steps
        self.moveProgress = moveProgress
        self.moveValue = moveValue
        self.exerciseProgress = exerciseProgress
        self.exerciseValue = exerciseValue
        self.standProgress = standProgress
        self.standValue = standValue
        self.restingHR = restingHR
        self.caffeineMg = caffeineMg
        self.caffeineTarget = caffeineTarget
        self.cups = cups
        self.lastBeverage = lastBeverage
        self.bookCoverURL = bookCoverURL
        self.bookProgress = bookProgress
        self.latitude = latitude
        self.longitude = longitude
        self.placeName = placeName
        self.placeSubtitle = placeSubtitle
        self.locationStatus = locationStatus
    }
}

// MARK: - Sample data

public extension DatastreamHomeData {
    /// Representative sample matching the approved Direction-1 mockup.
    /// Used by SwiftGallery and Xcode previews.
    static let sample = DatastreamHomeData(
        steps: 8247,
        moveProgress: 0.974, moveValue: "487",
        exerciseProgress: 1.0, exerciseValue: "45+",
        standProgress: 0.917, standValue: "11/12",
        restingHR: 58,
        caffeineMg: 165, caffeineTarget: 400, cups: 2, lastBeverage: "Espresso",
        // First-party gallery/preview fixture URL — not an API endpoint (exception: S27)
        bookCoverURL: URL(string: "https://d1pfm520aduift.cloudfront.net/images/books/1984820710.webp"),
        bookProgress: 0.68,
        latitude: 37.7955, longitude: -122.3937,
        placeName: "Blue Bottle Coffee",
        placeSubtitle: "Ferry Building",
        locationStatus: "Currently here · 34m",
        dateLabel: "Thursday, 3 July"
    )
}

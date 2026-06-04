import Foundation

enum WidgetCategory: String, CaseIterable, Identifiable, Hashable {
    case health
    case identity
    case location
    case reading
    case other
    case github

    var id: String {
        rawValue
    }

    var title: String {
        switch self {
        case .health: return "Health"
        case .identity: return "Identity"
        case .location: return "Location"
        case .reading: return "Reading"
        case .other: return "Other"
        case .github: return "GitHub"
        }
    }

    var subtitle: String {
        switch self {
        case .health: return "Heart rate, hydration, sleep, workouts"
        case .identity: return "Bio, identity card, coming soon"
        case .location: return "Exploration odometer, place leaderboard"
        case .reading: return "Bookshelf, modal, feed, theatre"
        case .other: return "Status, focus, DnD, heatmap, OG"
        case .github: return "Activity, commits, languages, repos"
        }
    }

    var iconName: String {
        switch self {
        case .health: return "heart.fill"
        case .identity: return "person.crop.square.fill"
        case .location: return "map.fill"
        case .reading: return "books.vertical.fill"
        case .other: return "square.grid.2x2.fill"
        case .github: return "chevron.left.forwardslash.chevron.right"
        }
    }

    /// The directory name used in `Sources/LifegamesWidgets/Resources/widgets/<category>/`.
    var fixtureDirectory: String {
        rawValue
    }
}

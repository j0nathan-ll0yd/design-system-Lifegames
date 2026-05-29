import LifegamesTokens
import SwiftUI

/// Colored status label for a book's reading state.
/// Owns the canonical status vocabulary and color mapping (web palette, OQ-1 resolved).
public struct BookStatusBadge: View {
    /// Canonical reading status vocabulary shared across iOS and design-system consumers.
    public enum Status: Sendable {
        case pending, reading, upNext, finished

        /// Canonical color mapping — web palette (OQ-1 resolved).
        /// reading→amber, finished→green, upNext→blue, pending→purple.
        public var color: Color {
            switch self {
            case .reading: LGColor.accentAmber
            case .finished: LGColor.accentGreen
            case .upNext: LGColor.accentBlue
            case .pending: LGColor.purple400
            }
        }

        var defaultLabel: String {
            switch self {
            case .pending: "PENDING"
            case .reading: "READING"
            case .upNext: "UP NEXT"
            case .finished: "FINISHED"
            }
        }

        /// Maps DS/web raw strings to canonical Status cases.
        /// Web uses "in_progress", "next", "completed" — do NOT assume name symmetry.
        public static func from(_ raw: String) -> Status {
            switch raw {
            case "in_progress": return .reading
            case "next": return .upNext
            case "completed", "finished": return .finished
            case "pending": return .pending
            default: return .pending
            }
        }
    }

    public let status: Status
    public let label: String?
    public let size: CGFloat

    public init(_ status: Status, label: String? = nil, size: CGFloat = 8) {
        self.status = status
        self.label = label
        self.size = size
    }

    public var body: some View {
        Text(label ?? status.defaultLabel)
            .font(.system(size: size, weight: .semibold))
            .foregroundStyle(status.color)
    }
}

#Preview("Book Status Badge") {
    VStack(alignment: .leading, spacing: 16) {
        BookStatusBadge(.reading)
        BookStatusBadge(.finished)
        BookStatusBadge(.upNext)
        BookStatusBadge(.pending)
        BookStatusBadge(.reading, label: "IN PROGRESS", size: 10)
        BookStatusBadge(BookStatusBadge.Status.from("in_progress"))
        BookStatusBadge(BookStatusBadge.Status.from("next"))
        BookStatusBadge(BookStatusBadge.Status.from("completed"))
    }
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

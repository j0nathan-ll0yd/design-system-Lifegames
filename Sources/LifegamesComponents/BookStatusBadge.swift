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

        /// Maps backend enum strings to canonical Status cases.
        /// Backend vocab: pending | reading | upNext | finished.
        public static func from(_ raw: String) -> Status {
            switch raw {
            case "reading": return .reading
            case "upNext": return .upNext
            case "finished": return .finished
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
        BookStatusBadge(BookStatusBadge.Status.from("reading"))
        BookStatusBadge(BookStatusBadge.Status.from("upNext"))
        BookStatusBadge(BookStatusBadge.Status.from("finished"))
        BookStatusBadge(BookStatusBadge.Status.from("pending"))
    }
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

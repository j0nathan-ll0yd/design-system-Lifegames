import Foundation

public struct TheatreReviewsProps: Hashable, Codable, Sendable {
    public let reviews: [Review]
    public let totalCount: Int

    public init(reviews: [Review], totalCount: Int) {
        self.reviews = reviews
        self.totalCount = totalCount
    }

    public struct Review: Hashable, Codable, Sendable {
        public let title: String
        public let grade: String
        public let posterUrl: String?
        public let url: String?

        public init(title: String, grade: String, posterUrl: String? = nil, url: String? = nil) {
            self.title = title
            self.grade = grade
            self.posterUrl = posterUrl
            self.url = url
        }

        public var gradeColor: String {
            switch grade.prefix(1).uppercased() {
            case "A": return "green"
            case "B": return "blue"
            case "C": return "amber"
            case "D", "F": return "red"
            default: return "amber"
            }
        }
    }
}
